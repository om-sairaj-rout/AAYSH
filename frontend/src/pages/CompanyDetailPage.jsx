import { useParams } from "react-router-dom";
import CompanyUserManagement from "./CompanyUserManagement";

const CompanyDetailPage = () => {
  const { companyID } = useParams();

  return (
    <CompanyUserManagement
      companyID={companyID}
      backPath="/user/registrations"
      backLabel="Back to Registration Overview"
    />
  );
};

export default CompanyDetailPage;
