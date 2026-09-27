# Security Specification & Test Blueprint

## 1. Data Invariants
1. **User Identity Invariant**: A user can only write their own profile (`/users/{userId}/public/profile` and `/users/{userId}/private/info`) where `{userId} == request.auth.uid`.
2. **PII Isolation Invariant**: Private information (`/users/{userId}/private/info`) is strictly non-readable by other users; only `request.auth.uid == userId` can access it.
3. **Receipt Ownership Invariant**: A receipt can only be created with `incoming().ownerId == request.auth.uid`.
4. **Receipt Immutability Invariant**: The `ownerId` and `createdAt` cannot be changed after creation (`incoming().ownerId == existing().ownerId` and `incoming().createdAt == existing().createdAt`).
5. **Temporal Integrity**: All timestamp fields (`createdAt`, `updatedAt`) must strictly match `request.time`.
6. **Strict Array Bounds**: `items` array must not exceed 50 entries, and `participants` array must not exceed 30 entries.
7. **Settlement State Integrity**: Updates to a receipt must either be by the owner updating items/details, or participants updating settlement state (`isPaid`, `paidAt`, `txHash`, `badge`) while preserving structural core fields.
8. **Secure List Query Invariant**: Listing receipts enforces `resource.data.ownerId == request.auth.uid`. Blanket reads without user ownership filters are strictly rejected.

## 2. The "Dirty Dozen" Attack Payloads

### Payload 1: Identity Spoofing on Receipt Creation
```json
{
  "path": "/receipts/rec-123",
  "operation": "create",
  "auth": { "uid": "attacker_uid", "token": { "email_verified": true } },
  "data": {
    "id": "rec-123",
    "ownerId": "victim_uid",
    "title": "Struk Nongkrong",
    "merchantName": "Cafe",
    "currency": "IDR",
    "exchangeRate": 16300,
    "subtotal": 100000,
    "grandTotal": 100000,
    "payerAddress": "0x123",
    "items": [],
    "participants": [],
    "createdAt": "2026-09-27T00:00:00Z",
    "updatedAt": "2026-09-27T00:00:00Z"
  },
  "expected": "PERMISSION_DENIED"
}
```

### Payload 2: Shadow Update Attack (Ghost Field Injection)
```json
{
  "path": "/receipts/rec-123",
  "operation": "update",
  "auth": { "uid": "owner_uid", "token": { "email_verified": true } },
  "data": {
    "isSystemAdmin": true,
    "bypassVerification": true
  },
  "expected": "PERMISSION_DENIED"
}
```

### Payload 3: Unauthenticated Read of User Private PII
```json
{
  "path": "/users/victim_uid/private/info",
  "operation": "get",
  "auth": null,
  "expected": "PERMISSION_DENIED"
}
```

### Payload 4: Cross-User PII Read
```json
{
  "path": "/users/victim_uid/private/info",
  "operation": "get",
  "auth": { "uid": "snooper_uid", "token": { "email_verified": true } },
  "expected": "PERMISSION_DENIED"
}
```

### Payload 5: Resource Exhaustion / Denial of Wallet (ID Poisoning)
```json
{
  "path": "/receipts/a_very_long_invalid_id_with_special_characters_!@#$%^&*()_that_exceeds_limits_and_is_junk_fill_data_1234567890",
  "operation": "create",
  "auth": { "uid": "user_uid", "token": { "email_verified": true } },
  "expected": "PERMISSION_DENIED"
}
```

### Payload 6: Array Flooding (Denial of Service via 500 items)
```json
{
  "path": "/receipts/rec-flood",
  "operation": "create",
  "auth": { "uid": "user_uid", "token": { "email_verified": true } },
  "data": {
    "id": "rec-flood",
    "ownerId": "user_uid",
    "items": [ /* 500 fake items */ ],
    "participants": []
  },
  "expected": "PERMISSION_DENIED"
}
```

### Payload 7: Fake Server Timestamp Attack
```json
{
  "path": "/receipts/rec-123",
  "operation": "create",
  "auth": { "uid": "user_uid", "token": { "email_verified": true } },
  "data": {
    "createdAt": "1999-01-01T00:00:00Z"
  },
  "expected": "PERMISSION_DENIED"
}
```

### Payload 8: Ownership Tampering on Existing Receipt
```json
{
  "path": "/receipts/rec-123",
  "operation": "update",
  "auth": { "uid": "owner_uid", "token": { "email_verified": true } },
  "data": {
    "ownerId": "transferred_uid"
  },
  "expected": "PERMISSION_DENIED"
}
```

### Payload 9: Blanket Query Scraping Without Owner Filter
```json
{
  "path": "/receipts",
  "operation": "list",
  "auth": { "uid": "user_uid", "token": { "email_verified": true } },
  "query": {},
  "expected": "PERMISSION_DENIED (Must query where ownerId == request.auth.uid)"
}
```

### Payload 10: Non-Verified Email Write Attempt
```json
{
  "path": "/receipts/rec-123",
  "operation": "create",
  "auth": { "uid": "unverified_uid", "token": { "email_verified": false } },
  "expected": "PERMISSION_DENIED"
}
```

### Payload 11: Cross-User Profile Write Overwrite
```json
{
  "path": "/users/victim_uid/public/profile",
  "operation": "update",
  "auth": { "uid": "attacker_uid", "token": { "email_verified": true } },
  "data": { "displayName": "Hacked Profile" },
  "expected": "PERMISSION_DENIED"
}
```

### Payload 12: Value Type Poisoning on Numeric Fields
```json
{
  "path": "/receipts/rec-123",
  "operation": "update",
  "auth": { "uid": "owner_uid", "token": { "email_verified": true } },
  "data": {
    "grandTotal": "NOT_A_NUMBER_PAYLOAD"
  },
  "expected": "PERMISSION_DENIED"
}
```

## 3. Test Runner Design
The rules will be verified against these 12 invariants using Firestore rules evaluation tests ensuring full ABAC coverage.
