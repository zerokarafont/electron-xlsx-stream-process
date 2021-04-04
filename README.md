[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
## 规范化git提交
- `git add commitizen -D`
- `npx commitizen init cz-conventional-changelog --yarn --dev --exact`
- `yarn add -D husky`
- `npx husky install`
- `npx husky add .husky/prepare-commit-msg "exec < /dev/tty && git cz --hook || true"`