import { SignedIn, SignedOut, UserButton, SignInButton, SignUpButton } from "@clerk/nextjs";

export default function ProfilePage() {
  return (
    <div>
      <SignedIn>
        <h1>Welcome! You are signed in.</h1>
        <UserButton />
      </SignedIn>
      <SignedOut>
        <h1>You are not signed in.</h1>
        <SignInButton />
        <SignUpButton />
      </SignedOut>
    </div>
  );
}
