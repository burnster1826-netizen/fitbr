# Security Specification - Vigor AI Calorie Tracker

## 1. Data Invariants
1. A `FoodLog` entry must belong to the user who created it (`userId` must match `request.auth.uid`).
2. A `User` profile can only be read or written by the owner.
3. Timestamps must be numbers representation of the server time where specified, but since we use standard JS numbers for simplicity in this app, we'll validate types.
4. Nutritional values (calories, protein, etc.) must be non-negative.
5. `dateStr` must match the format `YYYY-MM-DD`.

## 2. The "Dirty Dozen" Payloads (Red Team Test Cases)
1. **Identity Spoofing**: Creating a User profile for a different UID.
2. **Access Breach**: Reading someone else's User profile.
3. **Log Hijacking**: Creating a FoodLog entry with someone else's `userId`.
4. **Log Snoop**: Reading someone else's food logs via list query.
5. **Data Poisoning**: Injecting 1MB string into `foodName`.
6. **Negative Nutrition**: Setting `calories` to -500.
7. **Type Mismatch**: Setting `calories` to a boolean.
8. **Shadow Field**: Adding `isAdmin: true` to a User profile.
9. **Log Deletion**: Deleting someone else's log entry.
10. **Log Modification**: Updating someone else's log entry.
11. **Massive ID**: Using a document ID > 2KB.
12. **Unverified Login**: Performing writes without a verified email (if strictly required).

## 3. Test Runner (Draft Plan)
We will verify that all write/read attempts that violate the above are denied by Firestore rules.
