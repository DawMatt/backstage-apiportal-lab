#!/usr/bin/env bash
# Fails if root README.md hasn't been updated to reference every labs/ and specs/ directory.
# Run manually with `bash scripts/check-readme.sh`; also enforced in CI on every push/PR.
set -euo pipefail
cd "$(dirname "$0")/.."

fail=0

for dir in labs/lab-*/; do
  name=$(basename "$dir")
  if ! grep -q "labs/${name}/" README.md; then
    echo "README.md does not link to labs/${name}/ — add it to the Lab Series table and Repository Structure section."
    fail=1
  fi
done

for dir in specs/*/; do
  name=$(basename "$dir")
  if ! grep -q "$name" README.md; then
    echo "README.md does not mention specs/${name}/ — add it to the Repository Structure section."
    fail=1
  fi
done

if [ "$fail" -ne 0 ]; then
  echo
  echo "Root README.md is out of sync with labs/ and specs/. Update it, then re-run this check."
  exit 1
fi

echo "README.md references every labs/ and specs/ directory."
