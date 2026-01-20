---
trigger: always_on
---

# Project Rules & Guidelines

## UI & Styling

- **Shadcn UI**: Primary library for UI components. All new UI elements should utilize Shadcn UI components where available to ensure design consistency.
- **Tailwind CSS**: Use for custom styling and layout utility classes.

## Library Usage

- **Third-party Libraries**: You are strictly encouraged to use external libraries if they improve application performance, developer experience, or provide robust solutions to complex problems. Do not reinvent the wheel if a proven library exists.

## Performance & Architecture

- **Client Components**: Keep Client Components (`"use client"`) as small as possible and push them to the leaves of the component tree. Minimizing the amount of client-side JavaScript is a priority. Use Server Components for data fetching and layout structure whenever possible.
