import { ModulePlaceholder } from "../components/ui/ModulePlaceholder";

export function TransactionsPage() {
  return (
    <ModulePlaceholder
      title="Transactions"
      description="Normalized transactions from every uploaded bank file. Source bank and original row metadata will be preserved."
      planned={[
        "Cross-bank search and filters",
        "Account-to-account graph lookup",
        "Source file and column-mapping trace",
        "Merchant and city metadata",
      ]}
    />
  );
}
