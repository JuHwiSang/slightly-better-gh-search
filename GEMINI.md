# Antigravity AI Configuration

## Project Overview

**Project Name**: Slightly Better GitHub Search  
**Purpose**: Enhanced GitHub Code Search with custom filtering capabilities  
**Tech Stack**: SvelteKit (based on open files)

## Core Functionality

This project provides an upgraded version of GitHub Code Search with the following key features:

### Main Features
1. **Dual Input System**:
   - **Main Search Input**: Primary GitHub code search query
   - **Additional Filter Input**: Custom filter expression for advanced filtering
   
2. **Filter Expression**:
   - Single input field (not multiple checkboxes)
   - Safely evaluated as conditional expressions
   - Examples: `stars > 100 && language == 'js'`

### UI Design
- Minimalist interface with only 2 input fields
- Main search input
- Additional filter input

## AI Collaboration Rules

### File Modification Protocol
**CRITICAL**: When the user points out mistakes or issues during collaboration:
1. Document the mistake in this `GEMINI.md` file
2. Add it to the "Common Mistakes to Avoid" section below
3. This ensures the same mistake is not repeated in future interactions

### Code Standards
- Follow SvelteKit best practices
- Maintain clean, readable code
- Prioritize safe evaluation of filter expressions (security is critical)

## Common Mistakes to Avoid

> **Note**: This section will be populated as the user provides feedback during development.

<!-- User-reported issues will be documented here -->

## Project Structure

```
slightly-better-gh-search/
├── src/
│   └── routes/
│       ├── +layout.svelte
│       └── +page.svelte
└── GEMINI.md (this file)
```

## Development Notes

- **Primary Audience**: This documentation is written for AI assistants to understand project context
- **Update Frequency**: Update this file whenever user feedback reveals areas for improvement
- **Filter Safety**: All filter expressions must be safely evaluated to prevent code injection

## Future Considerations

- Filter expression syntax documentation
- Error handling for invalid filter expressions
- Performance optimization for large result sets
- Caching strategy for GitHub API responses

---

*Last Updated: 2026-01-09*  
*This file should be updated whenever the user identifies issues or provides important feedback.*
