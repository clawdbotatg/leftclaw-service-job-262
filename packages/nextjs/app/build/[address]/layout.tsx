// Static export requires at least one param to be pre-rendered for the dynamic
// segment. The real address is read client-side via useParams, so we only need
// a placeholder build page generated at build time; client navigation handles
// the rest.
export function generateStaticParams() {
  return [{ address: "0x0000000000000000000000000000000000000000" }];
}

const BuildLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default BuildLayout;
