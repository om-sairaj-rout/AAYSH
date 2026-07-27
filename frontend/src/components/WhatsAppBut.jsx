import { FaWhatsapp } from 'react-icons/fa';

const WhatsAppBut = () => {
  return (
    <>
          <a
            href="https://wa.me/918882719505?text=Hello" 
            className="fixed bottom-10 right-10 bg-green-500 p-4 rounded-full text-white text-5xl shadow-lg hover:bg-green-600 transition-colors z-50"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaWhatsapp />
          </a>
    </>
  )
}

export default WhatsAppBut