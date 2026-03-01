export default function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-[#1F2937]/70">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-white/70 md:grid-cols-4">
        <div>
          <p className="text-lg font-black text-white">ChaoLoey</p>
          <p className="mt-2">Premium car rental with fast booking flow and transparent pricing.</p>
        </div>
        <div>
          <p className="font-semibold text-white">Company</p>
          <ul className="mt-2 space-y-1">
            <li><a href="/" className="hover:text-white">Home</a></li>
            <li><a href="/search" className="hover:text-white">Search</a></li>
            <li><a href="/account" className="hover:text-white">Account</a></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white">Support</p>
          <ul className="mt-2 space-y-1">
            <li>help@chaoloey.com</li>
            <li>+66 2 000 0000</li>
            <li>Mon-Sun 08:00 - 22:00</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white">Legal</p>
          <ul className="mt-2 space-y-1">
            <li>Terms of Service</li>
            <li>Privacy Policy</li>
            <li>Cancellation Policy</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
