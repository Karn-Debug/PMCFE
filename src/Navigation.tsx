import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  UsersRound,
  Settings2,
  ChevronDown,
  FileSignature,
  Users,
  Building2,
  Circle,
} from "lucide-react";
export const routeLabels: Record<string, string> = {
  "/": "Dashboard",
  "/settings": "Profile & Team",
  "/developers": "Developer List",
  "/tender-form": "Tender Form",
  "/schemes": "Permission",
  "/document-drafts": "Document Drafts",
  "/templates/workorder": "Workorder Template",
  "/templates/demand": "Demand/Invoice",
  "/templates/terms": "Terms & Conditions",
  "/letterhead": "Letterhead",
  "/tenders": "Tenders",
  "/tasks": "Teamspace",
  "/projects": "Live Projects",
};
export function LegacyNavigation() {
  const location = useLocation(),
    [setup, setSetup] = useState(true),
    [templates, setTemplates] = useState(
      location.pathname.startsWith("/templates"),
    );
  useEffect(() => {
    if (location.pathname.startsWith("/templates")) {
      setSetup(true);
      setTemplates(true);
    } else if (
      [
        "/tender-form",
        "/schemes",
        "/developers",
        "/document-drafts",
        "/letterhead",
      ].includes(location.pathname)
    )
      setSetup(true);
  }, [location.pathname]);
  return (
    <nav className="legacy-navigation" aria-label="Main navigation">
      <NavLink to="/" end>
        <LayoutDashboard size={19} />
        <span>Dashboard</span>
      </NavLink>
      <NavLink to="/settings">
        <UsersRound size={19} />
        <span>Profile &amp; Team</span>
      </NavLink>
      <button
        className="nav-group-toggle"
        aria-expanded={setup}
        aria-controls="setup-menu"
        onClick={() => setSetup(!setup)}
      >
        <Settings2 size={19} />
        <span>Setup/Manage</span>
        <ChevronDown size={16} className={setup ? "expanded" : ""} />
      </button>
      {setup && (
        <div id="setup-menu" className="nav-submenu">
          <NavLink to="/developers">
            <Circle size={5} fill="currentColor" />
            <span>Developer List</span>
          </NavLink>
          <NavLink to="/tender-form">
            <Circle size={5} fill="currentColor" />
            <span>Tender Form</span>
          </NavLink>
          <NavLink to="/schemes">
            <Circle size={5} fill="currentColor" />
            <span>Permission</span>
          </NavLink>
          <NavLink to="/document-drafts">
            <Circle size={5} fill="currentColor" />
            <span>Document Drafts</span>
          </NavLink>
          <button
            className="nav-group-toggle nested-toggle"
            aria-expanded={templates}
            aria-controls="template-menu"
            onClick={() => setTemplates(!templates)}
          >
            <Circle size={5} fill="currentColor" />
            <span>Template</span>
            <ChevronDown size={15} className={templates ? "expanded" : ""} />
          </button>
          {templates && (
            <div id="template-menu" className="nav-submenu template-submenu">
              <NavLink to="/templates/workorder">
                <span>Workorder Template</span>
              </NavLink>
              <NavLink to="/templates/demand">
                <span>Demand/Invoice</span>
              </NavLink>
              <NavLink to="/templates/terms">
                <span>Terms &amp; Conditions</span>
              </NavLink>
            </div>
          )}
          <NavLink to="/letterhead">
            <Circle size={5} fill="currentColor" />
            <span>Letterhead</span>
          </NavLink>
        </div>
      )}
      <NavLink to="/tenders">
        <FileSignature size={19} />
        <span>Tenders</span>
      </NavLink>
      <NavLink to="/tasks">
        <Users size={19} />
        <span>Teamspace</span>
      </NavLink>
      <NavLink to="/projects">
        <Building2 size={19} />
        <span>Live Projects</span>
      </NavLink>
    </nav>
  );
}
