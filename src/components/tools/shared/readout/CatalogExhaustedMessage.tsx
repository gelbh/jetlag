interface CatalogExhaustedMessageProps {
  message: string;
}

export function CatalogExhaustedMessage({ message }: CatalogExhaustedMessageProps) {
  return <p className="text-sm text-status-warning">{message}</p>;
}
