export default function HomePage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>DOC-AI App Home</h1>
      <p>Welcome to your AI document generation app.</p>
      <a href="/login" style={{ color: "blue", textDecoration: "underline" }}>Login</a> |{" "}
      <a href="/signup" style={{ color: "blue", textDecoration: "underline" }}>Signup</a>
    </main>
  );
}
