import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-4xl font-bold">Page not found</h1>
      <p className="mt-2 text-ink-soft">The page you are looking for does not exist or has moved.</p>
      <Link to="/" className="mt-6 inline-block rounded-lg bg-ink px-5 py-2.5 font-semibold text-white">Go to the home page</Link>
    </div>
  );
}
