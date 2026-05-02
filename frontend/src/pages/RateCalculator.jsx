import { useState } from "react";
import { 
  Box, 
  MapPin, 
  ArrowRight, 
  Star, 
  Truck, 
  Info, 
} from "lucide-react";

const RateCalculator = () => {
  const [paymentType, setPaymentType] = useState("Prepaid");
  const [apptDelivery, setApptDelivery] = useState("No");

  const results = [
    {
      id: 1,
      name: "Ekart Surface 2 KG",
      partner: "RouteXMitra",
      rating: "4.5",
      price: "88.19",
      perKg: "37.37",
      isLowest: true,
      isSmart: true,
    },
    {
      id: 2,
      name: "Ekart Surface 1 KG",
      partner: "RouteXMitra",
      rating: "4.6",
      price: "107.26",
      perKg: "45.43",
      isLowest: false,
      isSmart: true,
    }
  ];

  return (
    <div className="flex flex-col gap-6 text-[#1e293b]">
      {/* --- INPUT FORM SECTION --- */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-6">
        
        {/* Row 1: Pins and Weight */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Origin Pin</label>
            <div className="relative">
              <input type="text" defaultValue="400001" className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 font-medium" />
              <div className="flex items-center gap-1 mt-1 text-[10px] text-blue-600">
                <MapPin size={10} /> Mumbai, Maharashtra
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Dest Pin</label>
            <div className="relative">
              <input type="text" defaultValue="110001" className="w-full p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 font-medium" />
              <div className="flex items-center gap-1 mt-1 text-[10px] text-blue-600">
                <MapPin size={10} /> New Delhi, Delhi
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Weight</label>
            <div className="relative flex items-center">
              <input type="text" defaultValue="2" className="w-full p-2.5 border border-gray-200 rounded-lg outline-none pr-10 font-medium" />
              <span className="absolute right-3 text-gray-400 text-xs font-bold">Kg</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Invoice Val</label>
            <input type="text" defaultValue="1500" className="w-full p-2.5 border border-gray-200 rounded-lg outline-none font-medium" />
          </div>
        </div>

        {/* Row 2: Dimensions */}
        <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/30">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase">
              <Box size={16} /> Dimensions
            </div>
            <div className="flex bg-gray-200 rounded p-0.5 text-[9px] font-bold">
              <button className="bg-orange-500 text-white px-2 py-0.5 rounded-sm">CM</button>
              <button className="px-2 py-0.5 text-gray-500">IN</button>
              <button className="px-2 py-0.5 text-gray-500">FT</button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {['QTY', 'L', 'W', 'H'].map((label) => (
              <div key={label} className="space-y-1 text-center">
                <label className="text-[10px] font-bold text-gray-400 uppercase">{label}</label>
                <input type="text" defaultValue={label === 'QTY' ? "1" : "10"} className="w-full p-2 border border-gray-200 rounded-lg text-center font-medium bg-white outline-none" />
              </div>
            ))}
          </div>
        </div>

        {/* Row 3: Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Payment Type</label>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button onClick={() => setPaymentType("Prepaid")} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${paymentType === "Prepaid" ? "bg-white shadow-sm text-blue-900" : "text-gray-400"}`}>Prepaid</button>
              <button onClick={() => setPaymentType("COD")} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${paymentType === "COD" ? "bg-white shadow-sm text-blue-900" : "text-gray-400"}`}>COD</button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Appt Delivery</label>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button onClick={() => setApptDelivery("No")} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${apptDelivery === "No" ? "bg-white shadow-sm text-blue-900" : "text-gray-400"}`}>No</button>
              <button onClick={() => setApptDelivery("Yes")} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${apptDelivery === "Yes" ? "bg-white shadow-sm text-blue-900" : "text-gray-400"}`}>Yes</button>
            </div>
          </div>
        </div>

        {/* Row 4: Buttons */}
        <div className="flex gap-4">
          <button className="flex-1 py-3 border border-blue-400 text-blue-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors">
            Reset
          </button>
          <button className="flex-3 py-3 bg-[#ff6b35] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-200 hover:bg-[#e85a25] transition-all">
            Calculate Rates <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* --- RESULTS SECTION --- */}
      <div className="flex flex-col gap-4">
        {results.map((item) => (
          <div key={item.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm relative group hover:border-blue-200 transition-all">
            {/* Top Badges */}
            <div className="absolute top-2 right-2 flex gap-2">
              {item.isLowest && <span className="bg-green-500 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">Lowest Price</span>}
              {item.isSmart && <span className="bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter">Smart Select</span>}
            </div>

            <div className="flex justify-between items-start">
              <div className="flex items-start gap-4">
                <input type="radio" name="rate_select" className="mt-1.5 w-4 h-4 accent-blue-600" />
                <div className="space-y-1">
                  <h3 className="font-bold text-gray-800">{item.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded font-bold text-gray-600">{item.partner}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-gray-400 font-medium">
                    <span className="flex items-center gap-1"><Star size={10} className="fill-yellow-400 text-yellow-400" /> {item.rating}</span>
                    <span className="flex items-center gap-1 uppercase"><Truck size={10} /> Surface</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[9px] border border-green-200 text-green-600 px-2 py-0.5 rounded font-bold uppercase bg-green-50/50">Door Pickup <ArrowRight size={8} className="inline ml-1" /></span>
                    <span className="text-[9px] border border-green-200 text-green-600 px-2 py-0.5 rounded font-bold uppercase bg-green-50/50">Door Delivery</span>
                  </div>
                  <p className="text-[10px] text-gray-400 flex items-center gap-1 pt-1">
                    <Info size={10} /> Transit: Standard service
                  </p>
                </div>
              </div>

              {/* Pricing */}
              <div className="text-right flex flex-col justify-between h-full">
                <div>
                  <div className="text-2xl font-bold text-gray-800">₹{item.price}</div>
                  <div className="text-[10px] text-gray-400 font-bold">@{item.perKg}/Kg</div>
                </div>
                <div className="mt-4 space-y-1">
                  <div className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded inline-block">Wt: 2Kg</div>
                  <button className="block w-full text-blue-600 text-[10px] font-bold hover:underline">View Breakup</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RateCalculator;