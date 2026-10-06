# Architecture rules
- Configure push public keys through VITE_VAPID_PUBLIC_KEY in the client and VAPID_PUBLIC_KEY in the sending function; retain the legacy public key only as a compatibility fallback for the existing deployment.
- Generate replacement VAPID key pairs locally using Node crypto and write private keys only to a user-owned file outside the project, never to logs or source control.