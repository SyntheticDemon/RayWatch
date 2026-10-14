import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export type BreadcrumbItem =
  | { label: string; to: string }
  | { label: ReactNode; current?: boolean };

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="breadcrumbs-item">
              {"to" in item && !isLast ? (
                <Link to={item.to}>{item.label}</Link>
              ) : (
                <span
                  className={isLast || ("current" in item && item.current) ? "breadcrumbs-current" : undefined}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
