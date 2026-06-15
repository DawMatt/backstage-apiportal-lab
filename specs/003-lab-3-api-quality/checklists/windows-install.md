# Windows Installation Requirements Checklist: Lab 3 — API Quality

**Purpose**: Validate that README requirements adequately cover Windows/PowerShell compatibility for the api-grade source-build fallback installation path, based on issues discovered during Run 1 testing (2026-06-15).
**Created**: 2026-06-15
**Feature**: [spec.md](../spec.md) — FR-002, FR-009, FR-012

**Source**: issues.md Run 1 findings — three categories of failure:
1. `yarn` commands unavailable / need npm equivalents
2. `cd -` is Bash-only, fails in PowerShell
3. `file:` protocol path resolves to wrong directory on Windows
4. `npm install` fails with peer dependency conflict

---

## Windows Command Compatibility (FR-012)

- [X] CHK001 - Is a Windows PowerShell equivalent documented for `cd -` (Bash directory stack navigation) wherever it appears in the source-build fallback steps? [Completeness, Spec §FR-012, Gap]
- [X] CHK002 - Are npm equivalents specified for every `yarn` command in the source-build fallback path, including `yarn install` → `npm install` and `yarn build` → `npm run build`? [Completeness, Spec §FR-012, Gap]
- [X] CHK003 - Does the README clearly indicate which package manager (yarn or npm) is expected at each stage of the source-build fallback, or does it document both so Windows users who cannot use yarn have a complete alternative? [Clarity, Spec §FR-012]
- [X] CHK004 - Are all shell-specific constructs in the README (e.g., `cd -`, Unix path separators in shell snippets, bash-style substitution) identified and paired with PowerShell equivalents? [Coverage, Spec §FR-012]

---

## File Protocol Path Correctness (FR-002)

- [X] CHK005 - Is the `file:` protocol path in the `yarn --cwd packages/app add` command verified to correctly resolve to the cloned `api-grade` repository from the working directory on both Windows and macOS? [Accuracy, Spec §FR-002, Gap — Run 1 showed the path resolved to `labs/api-grade` instead of the sibling directory beside the repo]
- [X] CHK006 - Does the README explicitly state the directory from which the `yarn --cwd packages/app add "file:..."` or `npm install "file:..."` command must be run, so learners can confirm the relative path is correct before executing? [Clarity, Spec §FR-002]
- [X] CHK007 - Is the expected location of the cloned `api-grade` repository (relative to the Backstage project and the repository root) unambiguously specified, so learners can verify the clone landed in the right place before attempting the file: install? [Clarity, Spec §FR-002]
- [X] CHK008 - Is the `file:` path in the npm alternative (`cd packages/app && npm install "file:..."`) verified to resolve correctly when the working directory is `packages/app` rather than the Backstage root? [Accuracy, Gap]
- [X] CHK009 - Does the README include a diagnostic step (e.g., verify the path exists before running install) that learners can use to confirm the clone location matches the documented path before attempting the source build install? [Coverage, Gap]

---

## Peer Dependency Conflict Resolution (FR-009)

- [X] CHK010 - Is the `@material-ui/core@4` / `@types/react@18` peer dependency conflict documented as a known issue in the troubleshooting section, with a specific resolution step (e.g., `--legacy-peer-deps`)? [Completeness, Spec §FR-009, Gap — Run 1 encountered this error when switching from yarn to npm]
- [X] CHK011 - Does the README explain why yarn is recommended over npm for the source-build install (yarn 4.x is more tolerant of peer dependency mismatches; npm requires `--legacy-peer-deps` for this project's dependency graph)? [Clarity, Spec §FR-012]
- [X] CHK012 - Is `npm install --legacy-peer-deps` documented as an explicit fallback when `npm install` fails with an ERESOLVE peer dependency error, rather than leaving learners to interpret the npm error output? [Completeness, Spec §FR-009, Gap]
- [X] CHK013 - Is the scope of the `--legacy-peer-deps` flag clarified — does it need to be applied at the package.json level (`.npmrc`) or just as a one-time command flag — so learners understand the risk surface? [Clarity, Gap]

---

## Requirement Consistency (FR-002 × FR-012)

- [X] CHK014 - Do the backend plugin installation instructions (Step 2b, T006) have the same npm alternatives and path verification steps as the frontend installation instructions, given both use the same `file:` protocol pattern? [Consistency, Spec §FR-002 × FR-012]
- [X] CHK015 - Are the Windows-specific path separator considerations (forward slash vs backslash in `file:` URLs) addressed — does the README specify that `file:` paths use forward slashes even on Windows? [Completeness, Gap]
- [X] CHK016 - Does the troubleshooting section (FR-009) now cover all three failure modes encountered in Run 1: (a) missing npm equivalents, (b) wrong file: path, (c) peer dependency conflict? [Coverage, Spec §FR-009]

---

## Notes

- All items stem from Windows/PowerShell testing in Run 1 (2026-06-15). macOS paths were not re-tested.
- CHK005 is the most critical: the `file:` path `../../../../api-grade/` resolves to `labs/api-grade/` (inside the repo) when run from the Backstage root with `--cwd packages/app`, but the clone target is the sibling directory *beside* the repo. The correct relative path from `packages/app` is `../../../../../../api-grade/` (6 levels up to the parent of the repo root, then into the sibling clone).
- CHK010/CHK012 are likely the fastest wins: add `--legacy-peer-deps` to the npm fallback command and note it in troubleshooting.
