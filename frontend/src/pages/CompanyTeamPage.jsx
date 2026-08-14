import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import CompanyUserManagement from "./CompanyUserManagement";
import { canManageTeam } from "../utils/permissions";

const CompanyTeamPage = () => {
  const { user } = useSelector((state) => state.auth);

  if (!canManageTeam(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!user?.companyID) {
    return (
      <div className="p-8 text-center text-slate-400">
        No company is linked to your account.
      </div>
    );
  }

  return (
    <CompanyUserManagement
      companyID={user.companyID}
      backPath="/dashboard"
      backLabel="Back to Dashboard"
    />
  );
};

export default CompanyTeamPage;
