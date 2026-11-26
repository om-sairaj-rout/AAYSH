export const TICKET_ISSUE_GROUPS = [
  {
    label: "Shipment Issue",
    options: [
      "Delay in delivery or return / Delivery instructions (Reattempt, hold, etc.)",
      "Merchant / Seller pickup issues",
      "Shipment not delivered / Need POD / Fake remark",
      "Issue with delivered/returned shipment (damage, missing, wrong, partial, etc.)",
      "Update shipment details",
      "Claims / Finance (disputes, remittance, bank details, etc.)",
    ],
  },
  {
    label: "Other Issue",
    options: ["Tech Support", "Account"],
  },
];

export const TICKET_ISSUE_TYPES = TICKET_ISSUE_GROUPS.flatMap((g) => g.options);

export const formatTicketIssueTypes = (ticket) => {
  if (Array.isArray(ticket?.issueTypes) && ticket.issueTypes.length) {
    return ticket.issueTypes.join(", ");
  }
  return ticket?.category || "—";
};