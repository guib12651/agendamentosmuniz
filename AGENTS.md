# Architecture rules
- Configure push public keys through VITE_VAPID_PUBLIC_KEY in the client and VAPID_PUBLIC_KEY in the sending function; retain the legacy public key only as a compatibility fallback for the existing deployment.
- Keep the public push key in Vite development and production environment files so preview and published builds use the same key without modifying the generated backend environment file.
- Generate replacement VAPID key pairs locally using Node crypto and write private keys only to a user-owned file outside the project, never to logs or source control.