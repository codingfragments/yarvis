#!/usr/bin/env python3
"""
Validate a briefing JSON against briefing_schema.json.

Pure-stdlib implementation — no third-party packages, no network, no uv.
Designed to work in sandboxed environments (e.g. Cowork) where pip/uv
package fetches are blocked.

Supports the subset of JSON Schema 2020-12 actually used by
briefing_schema.json:
    type (single or list, including 'null')
    enum
    pattern (re.search, ECMA-flavoured patterns are close enough)
    required
    properties
    items
    additionalProperties (true | false)
    minItems
    minimum
    oneOf  (with first-class handling of the X-or-null pattern)
    if / then / else  (object-level conditional)
    $ref  (only #/$defs/<name> form)

If briefing_schema.json grows to use a feature this validator doesn't
implement, validation will silently pass that constraint — extend below.

Usage:
    validate_briefing.py <schema_path> <candidate_path>

Always emits a single JSON object on stdout:
    {
      "valid": bool,
      "fatal": bool,
      "errors": [{path, got, expected, message}, ...],
      "total_errors": int,
      "shown": int
    }

Exit codes:
    0 = valid
    1 = invalid (schema violations)
    2 = fatal (file missing, bad JSON, unsupported $ref, etc.)
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any, Iterator

MAX_ERRORS = 25


# ── Output -------------------------------------------------------------------

def emit(payload: dict[str, Any], code: int) -> None:
    print(json.dumps(payload, ensure_ascii=False))
    sys.exit(code)


def fatal(message: str) -> None:
    emit(
        {"valid": False, "fatal": True, "errors": [{"path": "/", "message": message}]},
        2,
    )


# ── Helpers ------------------------------------------------------------------

def to_path(parts: tuple) -> str:
    return "/" + "/".join(str(p) for p in parts) if parts else "/"


def truncate_repr(v: Any) -> str:
    if isinstance(v, (dict, list)):
        return type(v).__name__
    s = repr(v)
    return s if len(s) <= 80 else s[:77] + "..."


_TYPE_TESTS = {
    "string": lambda v: isinstance(v, str),
    "integer": lambda v: isinstance(v, int) and not isinstance(v, bool),
    "number": lambda v: isinstance(v, (int, float)) and not isinstance(v, bool),
    "boolean": lambda v: isinstance(v, bool),
    "array": lambda v: isinstance(v, list),
    "object": lambda v: isinstance(v, dict),
    "null": lambda v: v is None,
}


def resolve_ref(ref: str, root: dict) -> dict:
    if not ref.startswith("#/"):
        raise ValueError(f"only local $ref is supported, got: {ref}")
    cur: Any = root
    for part in ref[2:].split("/"):
        if not isinstance(cur, dict) or part not in cur:
            raise ValueError(f"$ref target not found: {ref}")
        cur = cur[part]
    return cur


# ── Errors -------------------------------------------------------------------

class Err:
    __slots__ = ("path", "got", "expected", "message")

    def __init__(self, path: str, message: str, got: Any = None, expected: Any = None):
        self.path = path
        self.message = message
        self.got = got
        self.expected = expected

    def to_dict(self) -> dict:
        return {
            "path": self.path,
            "got": self.got,
            "expected": self.expected,
            "message": self.message,
        }


# ── Validator ----------------------------------------------------------------

def validate(
    instance: Any,
    schema: dict,
    root: dict,
    path: tuple = (),
) -> Iterator[Err]:
    # 1. Resolve $ref
    if "$ref" in schema:
        target = resolve_ref(schema["$ref"], root)
        yield from validate(instance, target, root, path)
        return

    # 2. Type
    if "type" in schema:
        types = schema["type"] if isinstance(schema["type"], list) else [schema["type"]]
        if not any(_TYPE_TESTS[t](instance) for t in types):
            yield Err(
                to_path(path),
                f"value is not of type {types if len(types) > 1 else types[0]}",
                got=truncate_repr(instance),
                expected=f"type {types if len(types) > 1 else types[0]!r}",
            )
            return  # downstream constraints assume the type check passed

    # 3. Enum
    if "enum" in schema:
        if instance not in schema["enum"]:
            yield Err(
                to_path(path),
                "value not in enum",
                got=truncate_repr(instance),
                expected="one of: " + ", ".join(repr(v) for v in schema["enum"]),
            )
            return

    # 4. String constraints
    if isinstance(instance, str) and "pattern" in schema:
        if not re.search(schema["pattern"], instance):
            yield Err(
                to_path(path),
                "string does not match pattern",
                got=truncate_repr(instance),
                expected=f"pattern {schema['pattern']!r}",
            )

    # 5. Numeric constraints
    if (
        isinstance(instance, (int, float))
        and not isinstance(instance, bool)
        and "minimum" in schema
        and instance < schema["minimum"]
    ):
        yield Err(
            to_path(path),
            "value below minimum",
            got=truncate_repr(instance),
            expected=f">= {schema['minimum']}",
        )

    # 6. Array constraints
    if isinstance(instance, list):
        if "minItems" in schema and len(instance) < schema["minItems"]:
            yield Err(
                to_path(path),
                "too few items",
                got=f"{len(instance)} items",
                expected=f"at least {schema['minItems']} items",
            )
        if "items" in schema:
            for i, item in enumerate(instance):
                yield from validate(item, schema["items"], root, path + (i,))

    # 7. Object constraints
    if isinstance(instance, dict):
        for req in schema.get("required", []):
            if req not in instance:
                yield Err(
                    to_path(path),
                    "missing required field",
                    got="(absent)",
                    expected=f"required field {req!r}",
                )

        props = schema.get("properties", {})
        for k, sub_schema in props.items():
            if k in instance:
                yield from validate(instance[k], sub_schema, root, path + (k,))

        ap = schema.get("additionalProperties", True)
        if ap is False:
            for k, v in instance.items():
                if k not in props:
                    yield Err(
                        to_path(path + (k,)),
                        f"unexpected field {k!r}",
                        got=truncate_repr(v),
                        expected="no unexpected fields (additionalProperties is false)",
                    )

        # if / then / else (object-level conditional)
        if "if" in schema:
            if_errors = list(validate(instance, schema["if"], root, path))
            if not if_errors and "then" in schema:
                yield from validate(instance, schema["then"], root, path)
            elif if_errors and "else" in schema:
                yield from validate(instance, schema["else"], root, path)

    # 8. oneOf — fast-path the X-or-null pattern that dominates our schema
    if "oneOf" in schema:
        branches = schema["oneOf"]
        null_branches = [b for b in branches if b == {"type": "null"}]
        other_branches = [b for b in branches if b != {"type": "null"}]

        if len(null_branches) == 1 and len(other_branches) == 1:
            # The common "X-or-null" wrapper. Either it's null and we accept,
            # or it's not null and must validate against the non-null branch.
            if instance is None:
                return
            yield from validate(instance, other_branches[0], root, path)
            return

        # General oneOf: exactly one branch must match
        matches: list[int] = []
        branch_errors: list[list[Err]] = []
        for i, sub in enumerate(branches):
            errs = list(validate(instance, sub, root, path))
            if not errs:
                matches.append(i)
            branch_errors.append(errs)

        if len(matches) == 0:
            # Surface the closest-matching branch's errors so the repair
            # prompt has something concrete to fix.
            non_empty = [errs for errs in branch_errors if errs]
            if non_empty:
                yield from min(non_empty, key=len)
            else:
                yield Err(
                    to_path(path),
                    "value matched no oneOf branch",
                    got=truncate_repr(instance),
                    expected="match exactly one of the oneOf branches",
                )
        elif len(matches) > 1:
            yield Err(
                to_path(path),
                "value matched multiple oneOf branches (ambiguous)",
                got=truncate_repr(instance),
                expected="match exactly one of the oneOf branches",
            )


# ── Entry point --------------------------------------------------------------

def main() -> None:
    if len(sys.argv) != 3:
        fatal("usage: validate_briefing.py <schema_path> <candidate_path>")

    schema_path = Path(sys.argv[1])
    candidate_path = Path(sys.argv[2])

    if not schema_path.is_file():
        fatal(f"schema not found: {schema_path}")
    if not candidate_path.is_file():
        fatal(f"candidate not found: {candidate_path}")

    try:
        schema = json.loads(schema_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        fatal(f"schema is not valid JSON: {e}")
    try:
        candidate = json.loads(candidate_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        fatal(f"candidate is not valid JSON: {e}")

    try:
        errors = list(validate(candidate, schema, schema))
    except ValueError as e:
        fatal(str(e))

    if not errors:
        emit({"valid": True, "fatal": False, "errors": []}, 0)

    shown = errors[:MAX_ERRORS]
    payload = {
        "valid": False,
        "fatal": False,
        "errors": [e.to_dict() for e in shown],
        "total_errors": len(errors),
        "shown": len(shown),
    }
    emit(payload, 1)


if __name__ == "__main__":
    main()
