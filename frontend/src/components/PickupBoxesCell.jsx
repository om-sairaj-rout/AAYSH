const PickupBoxesCell = ({ pickup }) => {
  const counts = Array.isArray(pickup?.orderBoxCounts)
    ? pickup.orderBoxCounts.filter((value) => value !== undefined && value !== null)
    : [];

  if (pickup?.hasMultipleOrders && counts.length > 1) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        {counts.map((boxes, index) => (
          <span
            key={index}
            className="text-[11px] font-semibold text-slate-700 whitespace-nowrap"
          >
            Order {index + 1}: {boxes}
          </span>
        ))}
      </div>
    );
  }

  if (Array.isArray(pickup?.noOfBoxes)) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        {pickup.noOfBoxes.map((boxes, index) => (
          <span
            key={index}
            className="text-[11px] font-semibold text-slate-700 whitespace-nowrap"
          >
            Order {index + 1}: {boxes}
          </span>
        ))}
      </div>
    );
  }

  const value = pickup?.noOfBoxes ?? pickup?.packagesCount ?? 1;
  return <span className="font-bold text-slate-700">{value}</span>;
};

export default PickupBoxesCell;
