// src/hooks/useSubscription.js
// Hook that reads the user's plan from Supabase and triggers Stripe checkout

import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { supabase } from "../lib/supabase";

export function useSubscription() {
  const { user, isLoaded } = useUser();
  const [plan, setPlan] = useState("free");
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user) return;

    async function fetchPlan() {
      const { data, error } = await supabase
        .from("users")
        .select("plan, subscription_status")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setPlan(data.plan === "pro" && data.subscription_status === "active" ? "pro" : "free");
      }
      setLoading(false);
    }

    fetchPlan();
  }, [user, isLoaded]);

  async function startCheckout() {
    if (!user) return;
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          email: user.primaryEmailAddress?.emailAddress,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // redirect to Stripe Checkout
      } else {
        console.error("No checkout URL returned:", data);
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setCheckoutLoading(false);
    }
  }

  return { plan, isPro: plan === "pro", loading, startCheckout, checkoutLoading };
}
