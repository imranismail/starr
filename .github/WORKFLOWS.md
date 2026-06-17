# GitHub Actions Workflows Documentation

This document describes all the GitHub Actions workflows configured for the Starr project.

## 🔄 Workflows Overview

### 1. Continuous Integration (`ci.yml`)

**Triggers:**
- Push to `main`, `master`, `develop` branches
- Pull requests to these branches
- Manual dispatch

**Jobs:**

#### Lint Job
- Runs on Ubuntu Latest
- Type checking with `npm run lint`
- Build verification

#### Test Matrix Job
- **OS Matrix**: Ubuntu, Windows, macOS
- **Node.js Matrix**: 18, 20, 22
- Runs full test suite with `npm run test:ci`
- Uploads coverage to Codecov (Ubuntu + Node 20 only)

#### Build Job
- Builds project and tests CLI functionality
- Uploads build artifacts for 7 days

#### Security Job
- Runs `npm audit` for dependency vulnerabilities
- Uses `audit-ci` for CI-friendly security checks

## 🔧 Local Development Simulation

To simulate CI locally:

```bash
# Run the same checks as CI
npm run test:ci && npm run lint && npm run build

# Test CLI functionality
node dist/index.js --help

# Generate coverage report
npm run test:coverage
```

## 🛡️ Security & Quality

### Quality Gates
- **Type safety**: TypeScript strict mode
- **Test coverage**: Tracked and reported
- **Cross-platform**: Tested on Ubuntu, Windows, macOS
- **Node.js compatibility**: Tested on LTS versions

## 📊 Monitoring & Reporting

- **Test Results**: Visible in PR checks
- **Coverage Reports**: Sent to Codecov

## 🔗 Badge Integration

The following badges are available in the README:
- CI Status
- Code Coverage

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed information about working with these workflows during development.
