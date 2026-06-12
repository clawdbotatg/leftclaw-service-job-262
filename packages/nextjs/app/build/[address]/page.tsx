"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Address, EtherInput } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { formatEther, formatUnits, parseEther } from "viem";
import { base } from "viem/chains";
import { useAccount, useSwitchChain } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

const PROVING_GROUNDS_ADDRESS = "0x72F6325C70d4cdfE14b55036090017B85628Abbc";

const BuildDetailInner = () => {
  const params = useParams();
  const buildAddress = (Array.isArray(params.address) ? params.address[0] : params.address) as string;

  const { address: connectedAddress, isConnected, chainId } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { switchChain } = useSwitchChain();

  const onWrongNetwork = isConnected && chainId !== base.id;

  // ---- Reads ----
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

  const { data: userHasStamp } = useScaffoldReadContract({
    contractName: "ProvingGrounds",
    functionName: "hasStamp",
    args: [connectedAddress, buildAddress],
  });

  const { data: reviews } = useScaffoldReadContract({
    contractName: "ProvingGrounds",
    functionName: "getReviews",
    args: [buildAddress],
  });

  const { data: bountyPool } = useScaffoldReadContract({
    contractName: "ProvingGrounds",
    functionName: "getBountyPool",
    args: [buildAddress],
  });

  const { data: bountyPerStamp } = useScaffoldReadContract({
    contractName: "ProvingGrounds",
    functionName: "getBountyPerStamp",
    args: [buildAddress],
  });

  const { data: stampBurnAmount } = useScaffoldReadContract({
    contractName: "ProvingGrounds",
    functionName: "stampBurnAmount",
  });

  const { data: allowance } = useScaffoldReadContract({
    contractName: "CLAWD",
    functionName: "allowance",
    args: [connectedAddress, PROVING_GROUNDS_ADDRESS],
  });

  // ---- Writes ----
  const { writeContractAsync: writeProvingGrounds } = useScaffoldWriteContract({
    contractName: "ProvingGrounds",
  });
  const { writeContractAsync: approveClawdAsync } = useScaffoldWriteContract({
    contractName: "CLAWD",
  });

  // ---- Local state ----
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const [approvalCooldown, setApprovalCooldown] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const [reviewText, setReviewText] = useState("");
  const [reviewTip, setReviewTip] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  const [fundAmount, setFundAmount] = useState("");
  const [funding, setFunding] = useState(false);

  // Whether this user has already reviewed (from chain reads + local state)
  const alreadyReviewedOnChain = useMemo(() => {
    if (!reviews || !connectedAddress) return false;
    return reviews.some(r => r.reviewer.toLowerCase() === connectedAddress.toLowerCase());
  }, [reviews, connectedAddress]);

  const hasAllowance = allowance !== undefined && stampBurnAmount !== undefined ? allowance >= stampBurnAmount : false;

  // ---- Handlers ----
  const handleApprove = async () => {
    if (stampBurnAmount === undefined) return;
    try {
      setApprovalSubmitting(true);
      await approveClawdAsync({
        functionName: "approve",
        args: [PROVING_GROUNDS_ADDRESS, stampBurnAmount],
      });
      // Cooldown to avoid double-submission while allowance read refreshes
      setApprovalCooldown(true);
      setTimeout(() => setApprovalCooldown(false), 5000);
    } catch (e) {
      notification.error("Failed to approve CLAWD");
      console.error(e);
    } finally {
      setApprovalSubmitting(false);
    }
  };

  const handleClaimStamp = async () => {
    try {
      setClaiming(true);
      await writeProvingGrounds({
        functionName: "claimStamp",
        args: [buildAddress],
      });
    } catch (e) {
      notification.error("Failed to claim stamp");
      console.error(e);
    } finally {
      setClaiming(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewText.trim()) {
      notification.error("Review text is required");
      return;
    }
    try {
      setSubmittingReview(true);
      await writeProvingGrounds({
        functionName: "submitReview",
        args: [buildAddress, reviewText],
        value: reviewTip ? parseEther(reviewTip) : 0n,
      });
      setReviewText("");
      setReviewTip("");
      setHasReviewed(true);
    } catch (e) {
      notification.error("Failed to submit review");
      console.error(e);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleFundBounty = async () => {
    if (!fundAmount) {
      notification.error("Enter an ETH amount to fund");
      return;
    }
    try {
      setFunding(true);
      await writeProvingGrounds({
        functionName: "fundBounty",
        args: [buildAddress],
        value: parseEther(fundAmount),
      });
      setFundAmount("");
    } catch (e) {
      notification.error("Failed to fund bounty");
      console.error(e);
    } finally {
      setFunding(false);
    }
  };

  // ---- Render: Claim Stamp button flow ----
  const renderStampAction = () => {
    if (!isConnected) {
      return (
        <button className="btn btn-primary w-full" onClick={openConnectModal} type="button">
          Connect Wallet
        </button>
      );
    }
    if (onWrongNetwork) {
      return (
        <button className="btn btn-warning w-full" onClick={() => switchChain({ chainId: base.id })} type="button">
          Switch to Base
        </button>
      );
    }
    if (userHasStamp) {
      return (
        <button className="btn btn-success w-full" disabled>
          ✓ Stamped
        </button>
      );
    }
    if (!hasAllowance) {
      return (
        <button
          className="btn btn-secondary w-full"
          onClick={handleApprove}
          disabled={approvalSubmitting || approvalCooldown}
        >
          {approvalSubmitting || approvalCooldown ? <span className="loading loading-spinner loading-sm" /> : null}
          Approve CLAWD
        </button>
      );
    }
    return (
      <button className="btn btn-primary w-full" onClick={handleClaimStamp} disabled={claiming}>
        {claiming ? <span className="loading loading-spinner loading-sm" /> : null}
        Claim Stamp
      </button>
    );
  };

  const showReviewForm = isConnected && !onWrongNetwork && userHasStamp && !alreadyReviewedOnChain && !hasReviewed;

  if (!build) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center grow pt-8 px-4 pb-20">
      <div className="w-full max-w-3xl flex flex-col gap-6">
        {/* Metadata */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body gap-3">
            <h1 className="card-title text-3xl">{build.name || "Unnamed Build"}</h1>
            <p className="opacity-80">{build.description}</p>
            {build.url && (
              <a href={build.url} target="_blank" rel="noreferrer" className="link link-primary break-all">
                {build.url}
              </a>
            )}
            <div className="text-sm">
              <Address address={buildAddress} />
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="badge badge-outline badge-lg">Stamps: {stampCount?.toString() ?? "0"}</span>
              {userHasStamp && <span className="badge badge-success badge-lg">✓ You stamped this</span>}
            </div>
          </div>
        </div>

        {/* Bounty */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body gap-2">
            <h2 className="card-title">Bounty Pool</h2>
            <div className="flex flex-wrap gap-4">
              <div className="stat-value text-2xl">{formatEther(bountyPool ?? 0n)} ETH</div>
            </div>
            <p className="text-sm opacity-70">Per-stamp share estimate: {formatEther(bountyPerStamp ?? 0n)} ETH</p>
          </div>
        </div>

        {/* Claim Stamp */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body gap-3">
            <h2 className="card-title">Claim Stamp</h2>
            {stampBurnAmount !== undefined && (
              <p className="text-sm opacity-70">Cost: {formatUnits(stampBurnAmount, 18)} CLAWD (burned)</p>
            )}
            {renderStampAction()}
          </div>
        </div>

        {/* Submit Review */}
        {showReviewForm && (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body gap-3">
              <h2 className="card-title">Submit Review</h2>
              <textarea
                className="textarea textarea-bordered w-full"
                placeholder="Share your thoughts on this build..."
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
              />
              <label className="text-sm opacity-70">Optional ETH tip</label>
              <EtherInput placeholder="0.0" onValueChange={({ valueInEth }) => setReviewTip(valueInEth)} />
              <button className="btn btn-primary w-full" onClick={handleSubmitReview} disabled={submittingReview}>
                {submittingReview ? <span className="loading loading-spinner loading-sm" /> : null}
                Submit Review
              </button>
            </div>
          </div>
        )}

        {/* Fund Bounty */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body gap-3">
            <h2 className="card-title">Fund Bounty</h2>
            <EtherInput placeholder="0.0" onValueChange={({ valueInEth }) => setFundAmount(valueInEth)} />
            {!isConnected ? (
              <button className="btn btn-primary w-full" onClick={openConnectModal} type="button">
                Connect Wallet
              </button>
            ) : onWrongNetwork ? (
              <button
                className="btn btn-warning w-full"
                onClick={() => switchChain({ chainId: base.id })}
                type="button"
              >
                Switch to Base
              </button>
            ) : (
              <button className="btn btn-primary w-full" onClick={handleFundBounty} disabled={funding}>
                {funding ? <span className="loading loading-spinner loading-sm" /> : null}
                Fund Bounty
              </button>
            )}
          </div>
        </div>

        {/* Reviews */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body gap-3">
            <h2 className="card-title">Reviews ({reviews?.length ?? 0})</h2>
            {!reviews || reviews.length === 0 ? (
              <p className="opacity-70 text-sm">No reviews yet.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {reviews.map((r, i) => (
                  <div key={i} className="border-b border-base-300 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Address address={r.reviewer} size="sm" />
                      {r.tipAmount > 0n && (
                        <span className="badge badge-accent badge-sm">Tip: {formatEther(r.tipAmount)} ETH</span>
                      )}
                    </div>
                    <p className="text-sm">{r.text}</p>
                    <p className="text-xs opacity-50 mt-1">{new Date(Number(r.timestamp) * 1000).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Gate the wagmi/RainbowKit-dependent component behind a client mount so its
// hooks never execute during the static-export prerender pass (which has no
// provider context).
const BuildDetail: NextPage = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return <BuildDetailInner />;
};

export default BuildDetail;
