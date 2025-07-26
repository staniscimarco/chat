"use client";
import React from "react";
import { Button } from "./ui/button";
import { Crown, Loader2 } from "lucide-react";

type Props = { isPro: boolean };

const SubscriptionButton = (props: Props) => {
  const [loading, setLoading] = React.useState(false);
  
  const handleSubscription = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/stripe");
      const data = await response.json();
      window.location.href = data.url;
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Button 
      disabled={loading} 
      onClick={handleSubscription} 
      className={`
        w-full font-medium py-3 rounded-xl transition-all duration-200
        ${props.isPro 
          ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white border-0 shadow-lg hover:shadow-xl' 
          : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg hover:shadow-xl'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
      ) : (
        <Crown className="w-4 h-4 mr-2" />
      )}
      {props.isPro ? "Gestisci Abbonamento" : "Ottieni Pro"}
    </Button>
  );
};

export default SubscriptionButton;
