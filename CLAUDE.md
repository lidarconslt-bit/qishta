# CLAUDE.md

# Project Development Rules

This file defines the permanent engineering rules for this project.

Always read this file before starting any task.

If any future prompt conflicts with these rules, stop and ask before proceeding.

---

# Mission

Build high-quality family-friendly web games.

Our goal is not to build many games.

Our goal is to build games that children genuinely enjoy playing and parents are happy to share.

Every development decision should support this mission.

---

# Core Philosophy

Gameplay first.

Fun before features.

Quality before quantity.

Simple before clever.

Playable before scalable.

Mobile before desktop.

Polish before expansion.

---

# Product Principles

Every game should:

• Be understood in less than 5 seconds.

• Start immediately.

• Feel satisfying.

• Finish in less than 2 minutes.

• Encourage replay.

• Be enjoyable without instructions.

---

# Engineering Principles

Choose the simplest architecture that solves today's problem.

Do not over-engineer.

Avoid unnecessary abstraction.

Avoid unnecessary files.

Avoid unnecessary dependencies.

Keep the code clean.

Keep components reusable.

Prefer readability over clever code.

---

# Performance

Performance is a feature.

Target smooth 60 FPS gameplay.

Avoid unnecessary renders.

Avoid expensive calculations inside render loops.

Use lightweight animations.

Lazy load only when necessary.

Keep bundle size small.

---

# Mobile First

Mobile experience always has priority.

Design for phones first.

Minimum supported width:

360px

Large touch targets.

Everything should be usable with one hand.

Responsive on phones, tablets and desktop.

---

# UI Principles

Simple.

Friendly.

Premium.

Modern.

Minimal.

Avoid visual noise.

Avoid clutter.

Whitespace is valuable.

Animations should support interaction.

Never distract the player.

---

# Animation Rules

Animations should feel soft.

Fast.

Natural.

Never exaggerated.

Every animation must have a purpose.

---

# Sound Rules

Use sound effects only.

Never autoplay music.

Sound effects should be:

Short.

Soft.

Rewarding.

Never annoying.

Every sound should communicate feedback.

---

# Code Quality

Write production-quality code.

No temporary hacks.

No duplicated code.

No commented-out code.

No dead files.

No unused imports.

No unused variables.

Always keep the project clean.

---

# Testing

Before completing any task:

Test everything yourself.

Verify:

Game starts correctly.

Game can be completed.

Game Over always works.

Replay always resets correctly.

Score always updates correctly.

Best score works.

Touch controls work.

Keyboard controls work.

Responsive layout works.

No console errors.

No TypeScript errors.

No build errors.

Fix every issue before presenting the work.

---

# Git

Create meaningful commits.

Keep commits focused.

Do not mix unrelated changes.

---

# Assets

Optimize images.

Optimize sounds.

Avoid unnecessary asset size.

---

# Accessibility

Readable typography.

Good contrast.

Large buttons.

Large touch targets.

Accessible navigation.

---

# Design Consistency

Use the same:

Buttons.

Cards.

Spacing.

Typography.

Colors.

Animations.

Icons.

Do not invent new styles unless requested.

---

# Scope Control

Only build today's objective.

Never continue with additional features.

Never guess future requirements.

If unsure,

ask.

---

# Decision Rule

Whenever you must choose between:

Adding a new feature

OR

Improving the existing experience

Always improve the existing experience.

---

# Product Rule

Every development session must end with something that can be played.

Never finish a session with infrastructure only.

Always produce visible progress.

---

# Definition of Done

A task is complete only when:

The feature works.

It has been tested.

It feels polished.

It performs smoothly.

It follows every rule in this document.

Only then present it.

---

# Final Rule

Think first.

Plan.

Build.

Test.

Polish.

Then stop.

Never continue beyond today's objective.


When today's task is finished and the user has tested the result,

stop all development servers unless the user explicitly asks to keep them running.