# AI-Ready Backend README Generation Prompt

You are a **Staff/Principal Backend Engineer**, **Software Architect**, and **Technical Documentation Expert**.

Your task is to analyze my **entire backend codebase** and generate a **single, comprehensive `README.md`** that serves as the complete source of truth for this project.

This README is **not** for beginners—it is primarily intended for:
- Senior frontend developers
- Backend developers
- DevOps engineers
- AI coding assistants (ChatGPT, Codex, Claude, Gemini, Cursor, Windsurf, etc.)

The goal is that **someone (or an AI) should be able to understand the backend architecture, API, data flow, authentication, database, business logic, and integration points without reading the source code first.**

---

# Instructions

Do **NOT** guess.

Everything must be derived from the actual codebase.

If something cannot be determined, explicitly write:

> "Not found in the current codebase."

Never hallucinate.

---

# README Structure

Generate a professional README with the following sections.

---

# 1. Project Overview

Explain:

- What this backend does
- The purpose of the project
- Business domain
- Main features
- Overall architecture
- Tech stack
- Runtime
- Framework
- Programming language
- Database
- ORM (if any)
- Authentication method
- Deployment strategy (if detectable)

---

# 2. High-Level Architecture

Explain the complete backend architecture.

Include:

- Request flow
- Response flow
- Authentication flow
- Middleware flow
- Database flow
- External services
- Internal services
- Queue system
- Event flow
- Cache flow

Draw architecture using Mermaid diagrams.

Example:

```mermaid
graph TD

Client --> Routes
Routes --> Middleware
Middleware --> Controllers
Controllers --> Services
Services --> Database
Services --> External APIs
Database --> Response
```

Generate all useful diagrams automatically.

---

# 3. Folder Structure

Explain every folder.

Example:

```text
src/
 ├── controllers/
 ├── routes/
 ├── services/
 ├── middleware/
 ├── config/
 ├── models/
 ├── utils/
 ├── validators/
```

For each folder explain:

- purpose
- responsibility
- dependencies

---

# 4. File-by-File Documentation

For EVERY important file explain:

- purpose
- exports
- responsibilities
- dependencies
- imported by
- related files

Example:

## authController.ts

Purpose:
Handles login, logout, register and refresh token.

Exports:
- login()
- logout()
- refreshToken()

Used by:
- authRoutes.ts

Uses:
- AuthService
- JWT
- UserRepository

Do this for every important backend file.

---

# 5. API Documentation

Automatically document every endpoint.

Include:

Method

Route

Description

Authentication required

Request Body

Request Params

Query Params

Headers

Response

Error Responses

Validation

Middleware

Controller

Service Used

Database tables touched

Side effects

Example request

Example response

Generate tables where appropriate.

---

# 6. Authentication

Explain everything.

Include:

JWT

Sessions

Cookies

Refresh Token

Access Token

OAuth

Roles

Permissions

RBAC

Middleware

Protected routes

Public routes

Token lifecycle

Expiration

Refresh flow

Logout flow

---

# 7. Authorization

Explain:

Role hierarchy

Permissions

Access control

Middleware

Ownership checks

Admin checks

---

# 8. Middleware

Document every middleware.

Purpose

Execution order

Input

Output

Errors

Used by

---

# 9. Controllers

Document every controller.

Explain:

Responsibilities

Methods

Business logic

Dependencies

Flow

---

# 10. Services

Explain every service.

Business logic

Responsibilities

Dependencies

Reusable functions

---

# 11. Database

Explain:

Database type

Tables

Collections

Relations

Indexes

Constraints

Enums

Triggers

Views

ORM structure

Migration strategy

Seed strategy

Connection lifecycle

Include ER diagrams in Mermaid.

---

# 12. Models

Explain every model.

Fields

Types

Relations

Indexes

Validation

Defaults

---

# 13. Request Lifecycle

Explain:

Client Request

↓

Route

↓

Middleware

↓

Validation

↓

Controller

↓

Service

↓

Repository

↓

Database

↓

Response

Use Mermaid sequence diagrams.

---

# 14. Business Logic

Explain every major business feature.

Examples:

Authentication

Payments

Orders

Notifications

Chats

Search

Analytics

Uploads

Scheduling

Anything implemented.

Describe complete workflow.

---

# 15. Environment Variables

Generate a table.

Variable

Purpose

Required

Default

Sensitive

Example

Never expose secret values.

---

# 16. Configuration

Explain:

Config files

Constants

Environment

Runtime settings

Feature flags

---

# 17. Validation

Explain:

Validation libraries

Validation flow

Schemas

Rules

Custom validators

---

# 18. Error Handling

Explain:

Global handler

Custom errors

HTTP codes

Response format

Logging

---

# 19. Logging

Explain:

Logger

Levels

Files

Format

Rotation

Monitoring

---

# 20. External Services

Explain every integration.

Email

SMS

Storage

Payment

OAuth

Analytics

Cloud

Third-party APIs

Webhook providers

---

# 21. Scheduled Jobs

Explain:

Cron jobs

Workers

Queues

Background processing

Retries

Dead Letter Queue

---

# 22. File Upload System

Explain:

Upload flow

Storage

Validation

Limits

Security

Cleanup

---

# 23. Security

Explain:

Authentication

Authorization

Input validation

Rate limiting

CORS

Helmet

Encryption

Hashing

Secrets

CSRF

XSS

SQL Injection

NoSQL Injection

Security headers

Best practices

Potential weaknesses

---

# 24. Performance

Explain:

Caching

Compression

Lazy loading

Indexes

Query optimization

Connection pooling

Streaming

Pagination

Batch processing

---

# 25. Frontend Integration Guide

This is extremely important.

Explain everything required by frontend developers.

Include:

Authentication flow

Token storage

Headers

Required cookies

Refresh flow

Login flow

Logout flow

API base URL

Request format

Response format

Error format

Pagination

Filtering

Sorting

Searching

Uploads

Downloads

Realtime connections

Socket events

Webhooks

Retry strategy

Timeouts

Rate limits

Best practices

Common mistakes

State management recommendations

Example frontend API client

Axios example

Fetch example

React Query example

RTK Query example

Next.js example

React example

Vue example

Angular example

Include complete code examples.

---

# 26. API Flow Examples

Create realistic examples.

Example:

User Login

↓

JWT

↓

Get Profile

↓

Refresh Token

↓

Logout

Show request/response at every step.

---

# 27. Complete Dependency Graph

Generate dependency graphs.

Show:

Routes

Controllers

Services

Repositories

Database

External services

Mermaid preferred.

---

# 28. Known Limitations

List:

Technical debt

Potential bugs

Scalability concerns

Security concerns

Code smells

Refactoring opportunities

---

# 29. AI Context Section

This section is the most important.

Generate an extensive section called:

# AI Context

This section should teach another AI everything about the backend.

Include:

Overall architecture

Folder responsibilities

Business rules

Naming conventions

Coding standards

Error handling style

Authentication style

Database strategy

Validation strategy

Logging strategy

Response format

Request flow

File organization

Extension guidelines

How to safely add new endpoints

How to safely add new services

How to safely modify business logic

Files that should never be modified without caution

Important architectural decisions

Implicit conventions

Common patterns

Anti-patterns

Reusable utilities

Design philosophy

Scalability strategy

Everything another AI needs before editing this project.

This section should be detailed enough that another AI can contribute accurately without first reading the entire repository.

---

# 30. Developer Guide

Explain:

How to install

How to run locally

Development workflow

Testing

Building

Deployment

Linting

Formatting

Debugging

Environment setup

Docker (if present)

CI/CD (if present)

---

# 31. Future Improvements

Suggest improvements in:

Architecture

Performance

Security

Scalability

Developer experience

Code organization

Documentation

Testing

Monitoring

---

# Documentation Quality Requirements

The generated README should:

- Be extremely detailed (10,000–30,000+ words if necessary).
- Use proper Markdown formatting.
- Include a table of contents with anchor links.
- Use Mermaid diagrams wherever helpful.
- Include tables for structured information.
- Include code snippets extracted from the project where useful.
- Cross-reference related sections.
- Be easy for both humans and AI to navigate.
- Avoid repeating information unnecessarily.

---

# Final Verification Checklist

Before finishing, verify that:

- Every route is documented.
- Every major folder is explained.
- Every important file is described.
- Every middleware is documented.
- Every service is documented.
- Every controller is documented.
- Every model is documented.
- Every authentication flow is explained.
- Every environment variable is listed.
- Every external integration is documented.
- Every database entity is described.
- Every frontend integration requirement is covered.
- Every major business workflow is explained.
- Every diagram accurately reflects the implementation.
- The README is sufficient for an experienced developer—or an AI assistant—to understand, maintain, extend, and integrate with the backend without needing to read the codebase first.