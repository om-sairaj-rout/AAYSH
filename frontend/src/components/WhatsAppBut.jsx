import { FaWhatsapp } from 'react-icons/fa';

const WhatsAppBut = () => {
  return (
    <>
    {/* WhatsApp Button */}
          <a
            href="https://wa.me/919310248736?text=Hello" // Replace with your WhatsApp link
            className="fixed top-8 right-8 bg-green-500 p-4 rounded-full text-white text-4xl shadow-lg hover:bg-green-600 transition-colors z-50"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaWhatsapp />
          </a>
    </>
  )
}

export default WhatsAppBut