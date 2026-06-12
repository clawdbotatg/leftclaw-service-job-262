"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const BuildCard = ({ buildAddress }: { buildAddress: string }) => {
  const { address: connectedAddress } = useAccount();

  const { data: build } = useScaffoldReadContract({
    contractName: "ProvingGrounds",
    functionName: "getBuild",
    args: [buildAddress],
  });

  const { data: stampCount } = useScaffoldReadContract({
    contractName: "ProvingGrounds",
    functionName: "getStampCount",
    args: [buildAddress],
  });

  const { data: reviewCount } = useScaffoldReadContract({
    contractName: "ProvingGrounds",
    functionName: "getReviewCount",
    args: [buildAddress],
  });

  const { data: bountyPool } = useScaffoldReadContract({
    contractName: "ProvingGrounds",
    functionName: "getBountyPool",
    args: [buildAddress],
  });

  const { data: userHasStamp } = useScaffoldReadContract({
    contractName: "ProvingGrounds",
    functionName: "hasStamp",
    args: [connectedAddress, buildAddress],
  });

  if (!build) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body items-center">
          <span className="loading loading-spinner loading-md" />
        </div>
      </div>
    );
  }

  return (
    <Link href={`/build/${buildAddress}`} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
      <div className="card-body gap-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="card-title">{build.name || "Unnamed Build"}</h2>
          {userHasStamp && <span className="badge badge-success badge-sm">✓ Stamped</span>}
        </div>
        <p className="text-sm opacity-80 min-h-[2.5rem]">{build.description}</p>
        {build.url && (
          <a
            href={build.url}
            target="_blank"
            rel="noreferrer"
            className="link link-primary text-sm truncate"
            onClick={e => e.stopPropagation()}
          >
            {build.url}
          </a>
        )}
        <div className="text-xs">
          <Address address={buildAddress} size="sm" />
        </div>
        <div className="card-actions justify-between mt-2">
          <div className="flex flex-wrap gap-2">
            <span className="badge badge-outline">Stamps: {stampCount?.toString() ?? "0"}</span>
            <span className="badge badge-outline">Reviews: {reviewCount?.toString() ?? "0"}</span>
          </div>
          <span className="badge badge-primary">Bounty: {formatEther(bountyPool ?? 0n)} ETH</span>
        </div>
      </div>
    </Link>
  );
};

const BuildsList = () => {
  const { data: builds, isLoading } = useScaffoldReadContract({
    contractName: "ProvingGrounds",
    functionName: "getAllBuilds",
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }
  if (!builds || builds.length === 0) {
    return <div className="text-center py-10 opacity-70">No builds registered yet.</div>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {builds.map(buildAddress => (
        <BuildCard key={buildAddress} buildAddress={buildAddress} />
      ))}
    </div>
  );
};

const Home: NextPage = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex items-center flex-col grow pt-10 px-5">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">The Proving Grounds</h1>
        <p className="text-lg opacity-80">Onchain registry for LeftClaw-verified builds</p>
      </div>

      <div className="w-full max-w-5xl">
        {mounted ? (
          <BuildsList />
        ) : (
          <div className="flex justify-center py-10">
            <span className="loading loading-spinner loading-lg" />
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
