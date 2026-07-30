import React from 'react';

/**
 * Reusable Order Tracking Progress Bar & Timeline Component
 * 
 * @param {Object} props
 * @param {string} props.awbNumber - The AWB tracking number
 * @param {string} props.currentStatus - Current shipping status (e.g. 'Booked', 'Shipped', 'In Transit', 'Out For Delivery', 'Delivered')
 * @param {Array} props.trackingHistory - List of tracking updates [{ status, location, remarks, failureReason, eventTime }]
 * @param {string} [props.courierName] - Optional courier name
 */
const OrderTracker = ({ awbNumber, currentStatus = 'Booked', trackingHistory = [], courierName }) => {
  if (!awbNumber) {
    return (
      <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-4 text-xs text-amber-800 flex items-center justify-between">
        <span>⚠️ No AWB assigned yet. Ship this order to generate tracking details.</span>
      </div>
    );
  }

  // Reverse history so latest checkpoints appear at the top
  const sortedHistory = trackingHistory;

  // Extract latest checkpoint location if available
  const latestLocation = sortedHistory.length > 0 && sortedHistory[0]?.location 
    ? sortedHistory[0].location 
    : null;

  // Progress Bar Steps definition
  const trackingSteps = ['Booked', 'Shipped', 'In Transit', 'Out For Delivery', 'Delivered'];

  const getStepStatus = (stepName) => {
    if (['Cancelled', 'RTO', 'Returned'].includes(currentStatus)) return 'error';
    const currentIndex = trackingSteps.indexOf(currentStatus);
    const stepIndex = trackingSteps.indexOf(stepName);

    if (currentIndex === -1) return 'upcoming';
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  // Calculate dynamic progress percentage for 5 steps
  const getProgressWidth = () => {
    const currentIndex = trackingSteps.indexOf(currentStatus);
    if (currentIndex <= 0) return 0;
    return (currentIndex / (trackingSteps.length - 1)) * 100;
  };

  return (
    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 space-y-5 font-sans">
      {/* Header Info Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Tracking Information</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-slate-500">AWB Number:</span>
            <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 text-xs">
              {awbNumber}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* LIVE CURRENT CITY / LOCATION BADGE */}
          {latestLocation && (
            <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-md flex items-center gap-1.5 shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              Current Location: {latestLocation}
            </span>
          )}

          {courierName && (
            <span className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-md shadow-xs">
              Courier: {courierName}
            </span>
          )}
        </div>
      </div>

      {/* Special Status Alert OR Progress Bar */}
      {['Cancelled', 'RTO', 'Returned'].includes(currentStatus) ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs font-semibold flex items-center gap-2">
          <span>⚠️</span> Order shipping status is marked as <strong>{currentStatus}</strong>.
        </div>
      ) : (
        /* Standard 5-Step Progress Bar */
        <div className="relative flex items-center justify-between pt-2 px-2">
          <div className="absolute top-[21px] left-6 right-6 h-1 bg-slate-200 -z-0">
            <div 
              className="h-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${getProgressWidth()}%` }}
            />
          </div>

          {trackingSteps.map((step) => {
            const status = getStepStatus(step);
            return (
              <div key={step} className="relative z-10 flex flex-col items-center text-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  status === 'completed' ? 'bg-indigo-600 text-white shadow-sm' :
                  status === 'current' ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-sm' :
                  'bg-white border-2 border-slate-300 text-slate-400'
                }`}>
                  {status === 'completed' ? '✓' : ''}
                  {status === 'current' ? '•' : ''}
                </div>
                <span className={`text-[11px] font-semibold mt-2 ${
                  status === 'current' ? 'text-indigo-600 font-bold' :
                  status === 'completed' ? 'text-slate-700' : 'text-slate-400'
                }`}>
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= TRACKING HISTORY TIMELINE (REVERSED) ================= */}
      {sortedHistory.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Transit Checkpoints & Updates ({sortedHistory.length})
          </h5>
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 font-sans before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {sortedHistory.map((event, idx) => {
              const isCurrentLoc = idx === 0;

              return (
                <div key={idx} className="relative text-xs">
                  {/* HIGHLIGHTED TIMELINE CIRCLE FOR CURRENT LOCATION */}
                  {isCurrentLoc ? (
                    <div className="absolute -left-[23px] top-0.5 flex h-4 w-4 items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-600 ring-4 ring-blue-100"></span>
                    </div>
                  ) : (
                    <div className="absolute -left-[19px] top-1 h-2.5 w-2.5 rounded-full border-2 border-slate-400 bg-white" />
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`font-bold ${isCurrentLoc ? 'text-blue-700 text-sm' : 'text-slate-800'}`}>
                      {event.status} {event.location ? `— ${event.location}` : ''}
                      {isCurrentLoc && (
                        <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-800 uppercase tracking-wider">
                          Current Location
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {event.eventTime ? new Date(event.eventTime).toLocaleString() : ''}
                    </span>
                  </div>

                  {event.remarks && (
                    <p className={`mt-0.5 inline-block rounded p-1.5 text-[11px] border ${
                      isCurrentLoc 
                        ? 'bg-blue-50/50 border-blue-200/60 text-blue-900 font-medium' 
                        : 'bg-white border-slate-200/60 text-slate-600'
                    }`}>
                      {event.remarks}
                    </p>
                  )}

                  {event.failureReason && (
                    <p className="text-red-600 font-semibold mt-0.5">Reason: {event.failureReason}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderTracker;