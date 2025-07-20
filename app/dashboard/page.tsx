"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, []);

  if (!user) return <p>Loading...</p>;

  return (
    <div className="p-4">
      <h1>Welcome, {user.email}</h1>
      <button
        onClick={async () => {
          await signOut(auth);
          router.push("/login");
        }}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Logout
      </button>
    </div>
  );
}

