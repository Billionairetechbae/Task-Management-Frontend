# Admiino User Application Guide


## Purpose

This repository contains the main Admiino user-facing application.


It provides:

- Dashboard
- Task management
- Project management
- Workbench
- User workflows


The frontend communicates with the backend API.


---

# Architecture Rules


The frontend is NOT the source of business logic.

Backend controls:

- permissions
- validation
- task rules
- workflow rules


Frontend controls:

- presentation
- user interaction
- UI state


Never duplicate backend rules in frontend code.


---

# API Usage


Before changing UI behaviour:

Understand:

- API endpoint
- request structure
- response structure
- authentication flow


Do not create assumptions about backend behaviour.


---

# Task UI Rules


Tasks may include:

- multiple assignees
- projects
- priorities
- deadlines
- statuses


When displaying tasks:

Always handle:

- missing projects
- missing attachments
- multiple users
- deleted entities


Do not assume relationships always exist.


---

# Authentication


Respect existing:

- authentication provider
- protected routes
- session handling


Never store:

- tokens insecurely
- sensitive information locally


---

# Components


Prefer:

- reusable components
- existing design patterns
- consistent UI behaviour


Avoid creating duplicate components for similar features.


---

# Debugging


Before modifying frontend:

Confirm whether issue is:

- frontend rendering
- API response
- backend logic
- permissions


Do not patch UI symptoms when backend data is incorrect.


---

# Testing


Before completing frontend changes:

Run:

- Type checking
- Tests
- Production build


Confirm no existing workflows break.


---

# UI Standards


Maintain:

- existing design system
- spacing
- typography
- component patterns


Avoid introducing inconsistent UI styles.