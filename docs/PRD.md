# Helper4U: Product Requirements Document

## 1. Overview
Helper4U is a web platform that connects households with verified domestic helpers: maids, babysitters and nannies. Households book helpers on hourly, monthly or yearly plans. Admins verify every helper before they can be booked and handle disputes.

## 2. Problem
Households usually hire domestic help through informal networks or unverified agents. This causes:
- no background verification
- unreliable service and sudden absences
- no standard pricing or plans
- poor communication and accountability
- manual follow-ups

## 3. Goals
**Primary:** digitize hiring, provide verified helpers, offer hourly/monthly/yearly plans, improve reliability and transparency.
**Secondary:** keep service history and performance records, support ratings and feedback, allow expansion across cities.

## 4. Users
| Role | Needs |
|---|---|
| Household | Find a trustworthy helper, compare prices, book, track service, give feedback, raise problems |
| Helper | Get a verified profile, set availability and rates, accept or reject work, see jobs and earnings |
| Admin | Verify helpers, manage users and categories, monitor bookings and attendance, resolve complaints, see analytics |

## 5. Scope
**In scope:** responsive web app, helper listings, booking and plan management, helper verification and profiles, ratings, complaints, notifications, admin analytics.
**Out of scope (Phase 1):** native mobile apps, payroll and salary payments, GPS tracking, online payments.

## 6. Functional requirements and status
### Household
| Requirement | Status |
|---|---|
| Register and log in | Done |
| Create household profile | Done |
| Browse helpers | Done |
| Search and filter by service type, experience level, availability, plan (plus city, day, price, rating) | Done |
| View helper profile: skills, verification, ratings, reviews | Done |
| Book a service on an hourly, monthly or yearly plan | Done |
| Track booking history and status; cancel; mark complete | Done |
| Rate and review a completed booking | Done |
| Report a problem (complaint) | Done |

### Helper
| Requirement | Status |
|---|---|
| Register and create profile | Done |
| Upload identity and background documents (PDF, JPG, PNG, up to 5 MB) | Done |
| Manage availability, working hours and preferred plans and rates | Done |
| Accept or reject requests | Done |
| View assigned jobs and work history | Done |
| Mark daily attendance | Done |
| View earnings (read-only) and reliability score | Done |

### Admin
| Requirement | Status |
|---|---|
| Verify or reject helper profiles and review each document | Done |
| Manage users (deactivate and reactivate) and service categories | Done |
| Monitor bookings, cancellations and attendance | Done |
| Handle complaints: in review, resolved or dismissed, with a note | Done |
| Analytics dashboard with the KPIs below | Done |
| Remove inappropriate reviews | Done |

## 7. Business rules
- A helper is visible and bookable only after admin verification.
- A verification request needs at least one identity document. Approval needs an approved identity document. Rejection needs a note.
- The price is fixed (snapshotted) when a booking is made.
- A helper cannot be double-booked: the date range, daily time window and weekdays are checked together.
- The household's address and the helper's phone are hidden until the helper accepts.
- A booking can be completed only after its service period ends. A review is allowed once per completed booking.
- Reliability score = attendance rate x (1 - helper cancellation rate), from 0 to 100. A helper with no history starts at 100.

## 8. User flow
1. Visit the site, register or log in.
2. Search for a maid, babysitter or nanny and apply filters.
3. Open a verified profile and choose a plan.
4. Send a booking request.
5. The helper accepts; the household then sees contact details.
6. The service runs and attendance is marked.
7. The booking is completed and the household leaves a review.

## 9. Non-functional requirements
| Area | How it is met |
|---|---|
| Performance | Small production bundle (about 97 kB gzipped JS), indexed queries, paginated lists |
| Security | bcrypt password hashing, JWT auth, role-based access, parameterized SQL, helmet, CORS allow-list, rate limiting on login and register, private document storage with owner/admin-only access |
| Usability | Responsive layout, plain-language messages, clear status labels |
| Scalability | Cities and service categories are data, not code; admin can add categories |

Personal data in transit should be protected with HTTPS in production. Passwords are never stored in plain text.

## 10. KPIs (admin dashboard)
Registered households, verified helpers, booking completion rate, helper reliability score, customer satisfaction rating, monthly active users. The dashboard also shows acceptance rate, completed booking value and breakdowns by status, service and plan.

## 11. Assumptions and constraints
- Helpers submit genuine documents; admins review them.
- Households give accurate requirements.
- Web only for Phase 1. Payments are arranged directly between household and helper.

## 12. Future enhancements
Online payments and salary management, a mobile app, leave tracking, multi-language support, emergency SOS.
