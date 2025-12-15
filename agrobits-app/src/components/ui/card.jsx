import React from "react";

export function Card({ children, className }) {
  return <div className={`bg-white rounded-lg p-4 shadow ${className}`}>{children}</div>;
}

export function CardContent({ children }) {
  return <div>{children}</div>;
}