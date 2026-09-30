import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Compass,
  Droplets,
  Gauge,
  Globe2,
  Home,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrainFront,
  Wind,
  X,
  Zap,
} from "lucide-react";
import { useState, type FormEvent, type HTMLAttributes, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ecoLensService, environmentalAlerts, environmentalSnapshotQuery, citySamples, type EnvironmentalSnapshot } from "@/lib/ecolens-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(environmentalSnapshotQuery),
  head: () => ({
    meta: [
      { title: "Eco Lens — Environmental intelligence" },
      { name: "description", content: "Understand your carbon footprint, your local air quality, and what to do next with Eco Lens." },
      { property: "og:title", content: "Eco Lens — Environmental intelligence" },
      { property: "og:description", content: "One clear view of your footprint, your local air quality, and the next actions that matter." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EcoLensApp,
});

type Screen = "Home" | "Air" | "Footprint" | "EcoPilot";
type Overlay = "location" | "activity" | "alerts" | "settings" | null;
const pollutantIcons: Record<string, LucideIcon> = { "NO₂": Activity, "O₃": Wind, "SO₂": Droplets, CO: Gauge };
const navItems: { label: Screen; icon: LucideIcon }[] = [
  { label: "Home", icon: Home },
  { label: "Air", icon: Wind },
  { label: "Footprint", icon: Gauge },
  { label: "EcoPilot", icon: Sparkles },
];

function EcoLensApp() {
  const { data } = useSuspenseQuery(environmentalSnapshotQuery);
  const [screen, setScreen] = useState<Screen>("Home");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [location, setLocation] = useState(data.location);
  const [activityCategory, setActivityCategory] = useState("Transport");
  const [notice, setNotice] = useState("");
  const go = (next: Screen) => { setOverlay(null); setScreen(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const close = () => setOverlay(null);
  const onLocation = (city: string) => { setLocation(city); setOverlay(null); setNotice(`Location updated to ${city}`); window.setTimeout(() => setNotice(""), 2400); };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col border-r border-border/70 bg-instrument px-4 py-6 lg:flex">
          <Brand />
          <p className="mb-3 mt-12 px-3 font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Workspace</p>
          <nav className="space-y-1" aria-label="Main navigation">
            {navItems.map((item) => <NavButton key={item.label} {...item} selected={screen === item.label} onClick={() => go(item.label)} />)}
          </nav>
          <div className="mt-auto space-y-2">
            <Button variant="ghost" className="h-11 w-full justify-start gap-3 px-3 text-muted-foreground hover:text-foreground" onClick={() => setOverlay("alerts")}><Bell className="size-4" />Alerts <span className="ml-auto size-2 rounded-full bg-signal-amber" /></Button>
            <Button variant="ghost" className="h-11 w-full justify-start gap-3 px-3 text-muted-foreground hover:text-foreground" onClick={() => setOverlay("settings")}><Settings2 className="size-4" />Settings</Button>
            <div className="mt-4 flex items-center gap-3 border-t border-border/70 px-3 pt-5">
              <div className="grid size-9 place-items-center rounded-full bg-primary/10 font-mono text-sm text-primary">G</div>
              <div><p className="text-sm font-medium">Gourav</p><p className="font-mono text-[10px] text-muted-foreground">BHOPAL, IN</p></div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">
          <header className="sticky top-0 z-30 border-b border-border/70 bg-background/95 backdrop-blur-md">
            <div className="mx-auto flex h-[66px] max-w-[940px] items-center justify-between px-5 sm:px-8">
              <div className="flex items-center gap-3 lg:hidden"><Brand compact /></div>
              <div className="hidden text-sm text-muted-foreground lg:block">Environmental intelligence <span className="mx-2 text-border">/</span><span className="text-foreground">{screen}</span></div>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" className="h-9 gap-2 border-border/80 bg-instrument px-3 text-xs font-medium sm:min-w-[156px] sm:justify-start" onClick={() => setOverlay("location")}><MapPin className="size-3.5 text-primary" /><span className="max-w-[120px] truncate">{location}</span><ChevronDown className="ml-auto size-3.5 text-muted-foreground" /></Button>
                <Button variant="ghost" size="icon" aria-label="Notifications" className="relative text-muted-foreground hover:text-foreground" onClick={() => setOverlay("alerts")}><Bell className="size-[18px]" /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-signal-amber" /></Button>
                <Button variant="ghost" size="icon" aria-label="Settings" className="hidden text-muted-foreground hover:text-foreground sm:inline-flex lg:hidden" onClick={() => setOverlay("settings")}><Settings2 className="size-[18px]" /></Button>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-[940px] px-5 pb-10 pt-7 sm:px-8 sm:pt-9">
            {screen === "Home" && <HomeScreen data={data} onGo={go} onOverlay={setOverlay} />}
            {screen === "Air" && <AirScreen data={data} location={location} onGo={go} />}
            {screen === "Footprint" && <FootprintScreen data={data} onGo={go} onLog={(category) => { setActivityCategory(category ?? "Transport"); setOverlay("activity"); }} />}
            {screen === "EcoPilot" && <EcoPilotScreen />}
          </main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-instrument/95 px-3 pb-[env(safe-area-inset-bottom)] pt-1.5 backdrop-blur lg:hidden" aria-label="Bottom navigation">
        <div className="mx-auto grid max-w-[480px] grid-cols-4">{navItems.map((item) => <NavButton key={item.label} {...item} selected={screen === item.label} onClick={() => go(item.label)} compact />)}</div>
      </nav>

      {overlay === "location" && <LocationDialog value={location} onSelect={onLocation} onClose={close} />}
      {overlay === "activity" && <ActivityDialog initialCategory={activityCategory} onClose={close} onSave={() => { close(); setNotice("Activity added to your sample footprint"); window.setTimeout(() => setNotice(""), 2400); }} />}
      {overlay === "alerts" && <AlertsDialog onClose={close} />}
      {overlay === "settings" && <SettingsDialog onClose={close} />}
      {notice && <div role="status" className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 border border-primary/25 bg-instrument px-4 py-3 text-sm shadow-lg lg:bottom-6"><Check className="size-4 text-primary" />{notice}</div>}
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-2.5"><div className="grid size-8 place-items-center rounded-md border border-primary/25 bg-primary/10"><span className="size-2 rounded-full bg-primary shadow-[0_0_12px_var(--signal-teal)]" /></div><div className="leading-tight"><p className="text-[14px] font-semibold">Eco Lens</p>{!compact && <p className="mt-1 font-mono text-[9px] uppercase tracking-[.16em] text-muted-foreground">Field instrument</p>}</div></div>;
}

function NavButton({ label, icon: Icon, selected, onClick, compact = false }: { label: Screen; icon: LucideIcon; selected: boolean; onClick: () => void; compact?: boolean }) {
  return <Button variant="ghost" onClick={onClick} aria-current={selected ? "page" : undefined} className={cn("h-[46px] justify-start gap-3 rounded-md px-3 text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground", selected && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary", compact && "h-[54px] flex-col justify-center gap-1.5 px-1 text-[10px]", compact && selected && "bg-transparent")}><Icon className={cn("size-[17px]", compact && "size-[19px]")} strokeWidth={selected ? 2.1 : 1.7} /><span>{label}</span>{!compact && selected && <span className="ml-auto size-1.5 rounded-full bg-primary" />}</Button>;
}

function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-wrap items-end justify-between gap-4 rise-in"><div><p className="mb-2 font-mono text-[10px] uppercase tracking-[.18em] text-primary">{eyebrow}</p><h1 className="text-[25px] font-semibold leading-tight tracking-[-.3px] sm:text-[30px]">{title}</h1><p className="mt-2 max-w-[600px] text-[13px] leading-relaxed text-muted-foreground sm:text-sm">{description}</p></div>{action}</div>;
}

function SectionHeading({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return <div className="mb-3 flex min-h-5 items-center justify-between gap-3"><h2 className="font-mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">{title}</h2>{trailing}</div>;
}

function Surface({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border border-border/80 bg-instrument", className)} {...props}>{children}</div>;
}

function HomeScreen({ data, onGo, onOverlay }: { data: EnvironmentalSnapshot; onGo: (screen: Screen) => void; onOverlay: (overlay: Overlay) => void }) {
  return <div className="space-y-7">
    <div className="rise-in"><p className="font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">TUESDAY, 29 SEPTEMBER · BHOPAL</p><div className="mt-2 flex flex-wrap items-baseline justify-between gap-2"><h1 className="text-[24px] font-semibold tracking-[-.2px] sm:text-[28px]">Good morning, Gourav</h1><span className="text-[13px] text-muted-foreground">Here's your environmental snapshot</span></div></div>
    <section className="grid gap-4 md:grid-cols-5">
      <Surface className="relative overflow-hidden p-5 md:col-span-3 sm:p-6">
        <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Air quality index</p><div className="mt-2 flex items-end gap-3"><span className="font-mono text-[62px] font-medium leading-none text-primary sm:text-[70px]">{data.aqi}</span><span className="mb-1.5 border border-signal-amber/25 bg-signal-amber/10 px-2 py-1 font-mono text-[10px] text-signal-amber">{data.airStatus}</span></div></div><span className="inline-flex items-center gap-2 pt-1 font-mono text-[9px] uppercase tracking-[.13em] text-signal-amber"><span className="size-1.5 rounded-full bg-signal-amber" />Elevated</span></div>
        <div className="mt-5 h-1.5 overflow-hidden bg-background"><div className="h-full w-[58%] bg-signal-amber" /></div><div className="mt-1.5 flex justify-between font-mono text-[8px] text-muted-foreground"><span>0</span><span>50</span><span>100</span><span>150</span><span>200+</span></div>
        <div className="mt-5 grid grid-cols-2 gap-3"><PollutantReading label="PM2.5" value={data.pm25} unit="µg/m³" tone="amber" /><PollutantReading label="PM10" value={data.pm10} unit="µg/m³" tone="amber" /></div>
        <Button variant="ghost" className="mt-4 h-8 gap-1 px-0 text-xs text-primary hover:bg-transparent hover:text-primary/80" onClick={() => onGo("Air")}>Explore local air <ArrowRight className="size-3.5" /></Button>
      </Surface>
      <Surface className="flex flex-col justify-between p-5 md:col-span-2 sm:p-6"><div className="flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Your footprint</p><p className="mt-3 font-mono text-[40px] font-medium leading-none">{data.footprint}<span className="ml-2 font-sans text-[13px] text-muted-foreground">kg CO₂e</span></p></div><FootprintRing value={76} /></div><div><p className="mt-3 flex items-center gap-1.5 font-mono text-[10px] text-signal-green"><ArrowDownRight className="size-3.5" />8.4% vs last month</p><MiniBars values={data.monthlyHistory} color="blue" /><Button variant="ghost" className="mt-2 h-8 gap-1 px-0 text-xs text-primary hover:bg-transparent hover:text-primary/80" onClick={() => onGo("Footprint")}>View your footprint <ArrowRight className="size-3.5" /></Button></div></Surface>
    </section>
    <section className="grid gap-4 md:grid-cols-2">
      <Surface className="p-5 sm:p-6"><div className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /><SectionHeading title="Today's insight" /></div><p className="mt-2 text-[14px] leading-[1.7] text-foreground/90">Air quality in your area is expected to remain elevated for the next 6 hours. Consider reducing prolonged outdoor activity.</p><Button className="mt-4 h-9 gap-2 text-xs" onClick={() => onGo("EcoPilot")}>Ask EcoPilot <ArrowRight className="size-3.5" /></Button></Surface>
      <Surface className="p-5 sm:p-6"><SectionHeading title="Quick actions" /><div className="grid grid-cols-2 gap-2.5"><QuickAction icon={Wind} label="Check Air" onClick={() => onGo("Air")} /><QuickAction icon={Plus} label="Log Activity" onClick={() => onOverlay("activity")} /><QuickAction icon={Gauge} label="View Footprint" onClick={() => onGo("Footprint")} /><QuickAction icon={MessageCircle} label="Ask EcoPilot" onClick={() => onGo("EcoPilot")} /></div></Surface>
    </section>
    <section><SectionHeading title="Your environmental trends" trailing={<span className="font-mono text-[9px] text-muted-foreground">PAST 6 MONTHS</span>} /><div className="grid gap-4 sm:grid-cols-2"><TrendTile title="CO₂e footprint" values={data.monthlyHistory} suffix="kg" color="blue" /><TrendTile title="PM2.5 concentration" values={[54, 61, 56, 73, 68, 78]} suffix="µg/m³" color="amber" /></div></section>
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-4 font-mono text-[9px] text-muted-foreground"><span className="flex items-center gap-1.5"><Clock3 className="size-3" />Sample readings · last updated 5 min ago</span><span>PM2.5 forecast is illustrative</span></div>
  </div>;
}

function PollutantReading({ label, value, unit, tone = "teal" }: { label: string; value: number; unit: string; tone?: "teal" | "amber" }) {
  return <div className="border border-border/70 bg-background/60 p-3"><p className="font-mono text-[9px] uppercase tracking-[.14em] text-muted-foreground">{label}</p><p className="mt-1.5 font-mono text-[22px] leading-none">{value}<span className="ml-1.5 text-[9px] text-muted-foreground">{unit}</span></p><div className="mt-2.5 h-1 bg-muted"><div className={cn("h-full", tone === "amber" ? "w-[78%] bg-signal-amber" : "w-[56%] bg-primary")} /></div></div>;
}

function FootprintRing({ value }: { value: number }) {
  return <div className="grid size-[68px] shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(var(--color-primary) ${value}%, var(--color-border) ${value}% 100%)` }}><div className="grid size-[56px] place-items-center rounded-full bg-instrument font-mono text-[10px] text-primary">{value}%</div></div>;
}

function MiniBars({ values, color = "blue" }: { values: number[]; color?: "blue" | "amber" }) {
  const maximum = Math.max(...values);
  return <div aria-label="Recent monthly trend" className="mt-4 flex h-[46px] items-end gap-1.5">{values.map((item, index) => <span key={`${index}-${item}`} className={cn("chart-reveal flex-1", color === "blue" ? "bg-signal-blue/50" : "bg-signal-amber/60", index === values.length - 1 && (color === "blue" ? "bg-signal-blue" : "bg-signal-amber"))} style={{ height: `${Math.max(14, item / maximum * 100)}%`, animationDelay: `${index * 30}ms` }} />)}</div>;
}

function QuickAction({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return <Button variant="outline" className="h-11 justify-start gap-2 border-border/70 bg-background/50 px-3 text-[11px] hover:border-primary/35 hover:bg-primary/5" onClick={onClick}><Icon className="size-3.5 text-primary" />{label}</Button>;
}

function TrendTile({ title, values, suffix, color }: { title: string; values: number[]; suffix: string; color: "blue" | "amber" }) {
  return <Surface className="p-4 sm:p-5"><div className="flex items-baseline justify-between gap-2"><p className="text-[12px] font-medium">{title}</p><p className="font-mono text-[10px] text-muted-foreground">{values.at(-1)} {suffix}</p></div><MiniBars values={values} color={color} /><div className="mt-2 flex justify-between font-mono text-[8px] text-muted-foreground"><span>APR</span><span>MAY</span><span>JUN</span><span>JUL</span><span>AUG</span><span>SEP</span></div></Surface>;
}

function AirScreen({ data, location, onGo }: { data: EnvironmentalSnapshot; location: string; onGo: (screen: Screen) => void }) {
  return <div className="space-y-7">
    <PageTitle eyebrow="LOCAL CONDITIONS / 01" title="Local Air Quality" description="Understand what's in the air around you, now and over the coming hours." action={<div className="flex items-center gap-2 border border-border/70 bg-instrument px-3 py-2 font-mono text-[10px]"><MapPin className="size-3.5 text-primary" />{location}</div>} />
    <section className="grid gap-4 md:grid-cols-5"><Surface className="p-5 sm:p-6 md:col-span-3"><div className="flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Air quality index</p><div className="mt-2 flex items-end gap-3"><span className="font-mono text-[70px] leading-none text-primary">{data.aqi}</span><span className="mb-2 border border-signal-amber/25 bg-signal-amber/10 px-2.5 py-1 font-mono text-[10px] text-signal-amber">{data.airStatus}</span></div></div><div className="pt-1 text-right"><p className="font-mono text-[9px] uppercase text-muted-foreground">CURRENT STATUS</p><p className="mt-2 flex items-center justify-end gap-1.5 font-mono text-[10px] text-signal-amber"><span className="size-1.5 rounded-full bg-signal-amber" />Elevated</p></div></div><div className="mt-6 h-1.5 overflow-hidden bg-background"><div className="h-full w-[58%] bg-signal-amber" /></div><div className="mt-2 flex justify-between font-mono text-[8px] text-muted-foreground"><span>Good · 0</span><span>50</span><span>100</span><span>150</span><span>200 · Poor</span></div><div className="mt-6 grid grid-cols-2 gap-3"><PollutantReading label="PM2.5" value={data.pm25} unit="µg/m³" tone="amber" /><PollutantReading label="PM10" value={data.pm10} unit="µg/m³" tone="amber" /></div></Surface><div className="grid grid-cols-2 gap-3 md:col-span-2">{data.pollutants.map((m) => <MetricCard key={m.label} label={m.label} value={m.value} unit={m.unit} icon={pollutantIcons[m.label] ?? Gauge} />)}</div></section>
    <section><SectionHeading title="PM2.5 · 24-hour trend" trailing={<div className="flex items-center gap-3 font-mono text-[9px]"><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-primary" />Historical</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-signal-amber" />Predicted</span></div>} /><Surface className="p-4 sm:p-6"><LineChart historical={data.pmHistory} forecast={data.pmForecast} /><div className="mt-4 grid grid-cols-4 gap-2 border-t border-border/70 pt-4 sm:grid-cols-7">{["Now", "+1h", "+2h", "+3h", "+4h", "+5h", "+6h"].map((label, i) => <div key={label} className="text-center"><p className="font-mono text-[8px] text-muted-foreground">{label}</p><p className={cn("mt-1 font-mono text-[12px]", i > 0 && "text-signal-amber")}>{data.pmForecast[i]}</p></div>)}</div></Surface><div className="mt-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[9px] text-muted-foreground"><span>Illustrative sample measurements and predictions</span><span className="border border-primary/20 bg-primary/5 px-2 py-1 text-primary">Forecast confidence · 87%</span></div></section>
    <section className="grid gap-4 md:grid-cols-5"><Surface className="p-5 md:col-span-2"><div className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /><SectionHeading title="AI forecast · next 6 hours" /></div><p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">Sample forecast suggests PM2.5 may rise before easing later today.</p><div className="mt-4 flex items-baseline gap-2"><span className="font-mono text-[30px] text-signal-amber">91</span><span className="font-mono text-[9px] text-muted-foreground">µg/m³ · predicted peak</span></div><p className="mt-2 text-[9px] text-muted-foreground">Forecast is illustrative; this model is not live.</p><Button className="mt-4 h-9 gap-2 text-xs" onClick={() => onGo("EcoPilot")}>Why is pollution high? <ArrowRight className="size-3.5" /></Button></Surface><div className="md:col-span-3"><SectionHeading title="Air quality insights" /><div className="space-y-2">{[{ text: "PM2.5 levels are currently elevated", tone: "amber" }, { text: "Wind may limit pollutant dispersion", tone: "blue" }, { text: "Pollution may stay high for several hours", tone: "teal" }].map((it) => <InsightRow key={it.text} text={it.text} tone={it.tone as "amber" | "blue" | "teal"} />)}</div></div></section>
    <p className="flex items-center gap-1.5 border-t border-border/70 pt-4 font-mono text-[9px] text-muted-foreground"><Clock3 className="size-3" />Last updated: 5 min ago · Sample data</p>
  </div>;
}

function MetricCard({ label, value, unit, icon: Icon }: { label: string; value: number; unit: string; icon: typeof Home }) {
  return <Surface className="flex min-h-[108px] flex-col justify-between p-3.5"><div className="flex items-center justify-between"><span className="font-mono text-[9px] uppercase tracking-[.13em] text-muted-foreground">{label}</span><Icon className="size-3.5 text-muted-foreground" /></div><p className="font-mono text-[22px] leading-none">{value}<span className="ml-1 text-[8px] text-muted-foreground">{unit}</span></p></Surface>;
}

function InsightRow({ text, tone }: { text: string; tone: "amber" | "blue" | "teal" }) {
  const toneClass = tone === "amber" ? "bg-signal-amber" : tone === "blue" ? "bg-signal-blue" : "bg-primary";
  return <Surface className="flex items-center gap-3 px-4 py-3"><span className={cn("size-1.5 shrink-0 rounded-full", toneClass)} /><p className="text-[12px] leading-relaxed">{text}</p><ArrowUpRight className="ml-auto size-3.5 shrink-0 text-muted-foreground" /></Surface>;
}

function LineChart({ historical, forecast }: { historical: number[]; forecast: number[] }) {
  const width = 720; const height = 188; const left = 38; const right = 16; const top = 12; const bottom = 28;
  const all = [...historical, ...forecast]; const min = Math.floor((Math.min(...all) - 10) / 20) * 20; const max = Math.ceil((Math.max(...all) + 10) / 20) * 20;
  const x = (index: number, count: number) => left + index / (count - 1) * (width - left - right);
  const y = (value: number) => top + (max - value) / (max - min) * (height - top - bottom);
  const points = (values: number[], start: number, total: number) => values.map((value, index) => `${x(start + index, total)},${y(value)}`).join(" ");
  const histPoints = points(historical, 0, historical.length + forecast.length - 1);
  const forePoints = points(forecast, historical.length - 1, historical.length + forecast.length - 1);
  const histEndX = x(historical.length - 1, historical.length + forecast.length - 1);
  const labels = [0, 6, 12, 18, 24];
  return <div className="w-full overflow-hidden"><svg viewBox={`0 0 ${width} ${height}`} className="chart-reveal block h-auto w-full" role="img" aria-label="PM2.5 readings rise from 47 to 78 before a sample forecast peaks at 91 and eases to 84 micrograms per cubic metre"><defs><linearGradient id="aqi-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" className="[stop-color:var(--color-primary)]" stopOpacity=".18"/><stop offset="100%" className="[stop-color:var(--color-primary)]" stopOpacity="0"/></linearGradient></defs>{[40, 60, 80, 100].map((value) => <g key={value}><line className="chart-grid" x1={left} x2={width - right} y1={y(value)} y2={y(value)} /><text className="chart-label" x={left - 9} y={y(value) + 3} textAnchor="end">{value}</text></g>)}<polygon points={`${histPoints} ${histEndX},${height - bottom} ${left},${height - bottom}`} fill="url(#aqi-fill)"/><polyline points={histPoints} className="chart-line"/><polyline points={forePoints} className="chart-forecast"/><circle cx={histEndX} cy={y(historical.at(-1) ?? 78)} r="4.5" fill="var(--color-primary)" stroke="var(--color-instrument)" strokeWidth="2"/>{labels.map((hour) => <text key={hour} className="chart-label" x={x(hour, 24)} y={height - 7} textAnchor="middle">{`${String(hour).padStart(2, "0")}:00`}</text>)}</svg></div>;
}

function FootprintScreen({ data, onGo, onLog }: { data: EnvironmentalSnapshot; onGo: (screen: Screen) => void; onLog: (category?: string) => void }) {
  const [period, setPeriod] = useState("6 months");
  const max = Math.max(...data.categories.map((category) => category.value));
  const activities = [
    { name: "Transport", icon: TrainFront },
    { name: "Electricity", icon: Zap },
    { name: "Food", icon: Activity },
    { name: "Travel", icon: Compass },
    { name: "Other", icon: Plus },
  ];
  return <div className="space-y-7">
    <PageTitle eyebrow="PERSONAL IMPACT / 02" title="My Carbon Footprint" description="See what's driving your monthly impact and where a small change can make a difference." action={<Button className="h-9 gap-2 text-xs" onClick={() => onLog("Transport")}><Plus className="size-4" />Log Activity</Button>} />
    <section className="grid gap-4 md:grid-cols-5"><Surface className="p-5 sm:p-6 md:col-span-3"><div className="flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Monthly footprint</p><div className="mt-3 flex items-baseline gap-2"><span className="font-mono text-[56px] leading-none">{data.footprint}</span><span className="text-[13px] text-muted-foreground">kg CO₂e</span></div><p className="mt-3 flex items-center gap-1.5 font-mono text-[10px] text-signal-green"><ArrowDownRight className="size-3.5" />{data.footprintChange}% from last month</p></div><div className="pt-1"><FootprintRing value={76} /></div></div><MiniBars values={data.monthlyHistory} /><div className="mt-2 flex justify-between font-mono text-[8px] text-muted-foreground"><span>APR</span><span>MAY</span><span>JUN</span><span>JUL</span><span>AUG</span><span>SEP</span></div></Surface><Surface className="flex flex-col justify-between p-5 sm:p-6 md:col-span-2"><div><div className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /><SectionHeading title="How can I reduce this?" /></div><p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">Transport makes up the largest share of your footprint. EcoPilot can help you explore lower-impact alternatives.</p></div><Button className="mt-5 h-9 w-fit gap-2 text-xs" onClick={() => onGo("EcoPilot")}>Ask EcoPilot <ArrowRight className="size-3.5" /></Button></Surface></section>
    <section><SectionHeading title="Monthly breakdown" trailing={<span className="font-mono text-[9px] text-muted-foreground">186 KG CO₂e TOTAL</span>} /><Surface className="divide-y divide-border/70 px-4 sm:px-6">{data.categories.map((category, i) => <button key={category.name} onClick={() => onLog(category.name)} className="group flex w-full items-center gap-3 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className={cn("grid size-8 shrink-0 place-items-center border border-border/70 bg-background font-mono text-[10px]", i === 0 ? "text-primary" : "text-muted-foreground")}>{String(i + 1).padStart(2, "0")}</span><div className="min-w-0 flex-1"><div className="flex justify-between gap-3 text-[12px]"><span>{category.name}</span><span className="font-mono">{category.value} <span className="text-[9px] text-muted-foreground">kg</span></span></div><div className="mt-2 h-1 bg-background"><div className={cn("h-full", i === 0 ? "bg-primary" : i === 1 ? "bg-signal-blue/80" : i === 2 ? "bg-signal-amber/80" : "bg-muted-foreground/50")} style={{ width: `${category.value / max * 100}%` }} /></div></div><ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" /></button>)}</Surface></section>
    <section><SectionHeading title="Log an activity" trailing={<button onClick={() => onLog("Other")} className="font-mono text-[9px] text-primary">+ OTHER DETAILS</button>} /><div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">{activities.map(({ name, icon: Icon }) => <Button key={name} variant="outline" className="h-auto min-h-[74px] flex-col items-start justify-between gap-3 border-border/70 bg-instrument p-3 hover:border-primary/35 hover:bg-primary/5" onClick={() => onLog(name)}><Icon className="size-4 text-primary" /><span className="text-[11px]">{name}</span></Button>)}</div></section>
    <section><SectionHeading title="Your trend" trailing={<div className="flex border border-border/70 font-mono text-[9px]">{["6 months", "Year"].map((option) => <button key={option} aria-pressed={period === option} onClick={() => setPeriod(option)} className={cn("px-2.5 py-1.5", period === option ? "bg-primary/10 text-primary" : "text-muted-foreground")}>{option}</button>)}</div>} /><Surface className="p-4 sm:p-6"><LineChart historical={period === "Year" ? [244, 238, 257, 249, 241, 232, 226, 234, 219, 212, 203, 186] : data.monthlyHistory} forecast={[]} /><p className="mt-2 font-mono text-[9px] text-muted-foreground">{period === "Year" ? "OCT · NOV · DEC · JAN · FEB · MAR · APR · MAY · JUN · JUL · AUG · SEP" : "APR · MAY · JUN · JUL · AUG · SEP"}</p></Surface></section>
    <p className="flex items-center gap-1.5 border-t border-border/70 pt-4 font-mono text-[9px] text-muted-foreground"><CircleHelp className="size-3" />Footprint values are sample estimates for demonstration only.</p>
  </div>;
}

type ChatMessage = { role: "assistant" | "user"; text: string; sources?: string[] };
const suggestedPrompts = ["Why is pollution high in my area?", "What will air quality look like tomorrow?", "How can I reduce my footprint by 20%?", "What's contributing most to my emissions?", "Give me 3 actions for today"];

function EcoPilotScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || typing) return;
    setInput(""); setMessages((current) => [...current, { role: "user", text: trimmed }]); setTyping(true);
    const reply = await ecoLensService.getAiReply(trimmed);
    window.setTimeout(() => { setMessages((current) => [...current, { role: "assistant", text: reply, sources: ["Current air data", "PM2.5 forecast", "Your footprint"] }]); setTyping(false); }, 750);
  }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void ask(input); }
  return <div className="space-y-6">
    <PageTitle eyebrow="ENVIRONMENTAL INTELLIGENCE / 03" title="EcoPilot" description="Your personal environmental intelligence assistant." action={<span className="flex items-center gap-2 border border-primary/20 bg-primary/5 px-3 py-2 font-mono text-[9px] text-primary"><span className="size-1.5 rounded-full bg-primary" />DEMO MODE</span>} />
    <Surface className="mx-auto flex min-h-[540px] max-w-[740px] flex-col sm:min-h-[590px]">
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3.5 sm:px-5"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center border border-primary/20 bg-primary/10"><Sparkles className="size-4 text-primary" /></div><div><p className="text-[12px] font-medium">EcoPilot</p><p className="mt-0.5 flex items-center gap-1.5 font-mono text-[9px] text-muted-foreground"><span className="size-1.5 rounded-full bg-signal-green" />ENVIRONMENTAL ASSISTANT</p></div></div><span className="font-mono text-[9px] text-muted-foreground">SAMPLE RESPONSES</span></div>
      <div className="flex-1 space-y-5 p-4 sm:p-5"><div className="flex max-w-[92%] gap-3"><div className="mt-1 grid size-7 shrink-0 place-items-center border border-primary/20 bg-primary/10"><Sparkles className="size-3.5 text-primary" /></div><div className="border border-border/70 bg-background/60 p-3.5 sm:p-4"><p className="whitespace-pre-line text-[12px] leading-[1.75] sm:text-[13px]">Hi! I'm EcoPilot. I can help you understand your carbon footprint, local air quality, and what you can do next.</p><div className="mt-3 flex flex-wrap gap-1.5">{["Current air data", "PM2.5 forecast", "Your footprint"].map((chip) => <span key={chip} className="border border-border/70 px-2 py-1 font-mono text-[8px] text-muted-foreground">{chip}</span>)}</div></div></div>
        {messages.map((message, index) => <div key={`${index}-${message.role}`} className={cn("flex gap-3", message.role === "user" && "justify-end")}><div className={cn("max-w-[88%] border p-3.5 sm:p-4", message.role === "assistant" ? "border-border/70 bg-background/60" : "border-primary/20 bg-primary/10")}><p className="text-[12px] leading-[1.75] sm:text-[13px]">{message.text}</p>{message.sources && <div className="mt-3 flex flex-wrap gap-1.5">{message.sources.map((source) => <span key={source} className="border border-border/70 px-2 py-1 font-mono text-[8px] text-muted-foreground">{source}</span>)}</div>}</div></div>)}
        {typing && <div role="status" aria-label="EcoPilot is thinking" className="flex items-center gap-2 border border-border/70 bg-background/60 px-4 py-3 text-muted-foreground"><Sparkles className="size-3.5 text-primary" /><span className="flex gap-1"><i className="size-1 animate-pulse rounded-full bg-primary"/><i className="size-1 animate-pulse rounded-full bg-primary [animation-delay:120ms]"/><i className="size-1 animate-pulse rounded-full bg-primary [animation-delay:240ms]"/></span><span className="font-mono text-[9px]">EcoPilot is thinking</span></div>}
      </div>
      {messages.length === 0 && <div className="border-t border-border/70 px-4 py-4 sm:px-5"><p className="mb-2.5 font-mono text-[9px] uppercase tracking-[.13em] text-muted-foreground">Suggested prompts</p><div className="flex flex-wrap gap-2">{suggestedPrompts.map((prompt) => <button key={prompt} onClick={() => void ask(prompt)} className="border border-border/70 bg-background/50 px-3 py-2 text-left text-[10px] leading-relaxed transition-colors hover:border-primary/35 hover:text-primary">{prompt}</button>)}</div></div>}
      <form onSubmit={submit} className="flex gap-2 border-t border-border/70 p-3 sm:p-4"><Input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about your air or footprint…" aria-label="Message EcoPilot" className="h-11 border-border/70 bg-background text-[12px]" /><Button size="icon" className="size-11 shrink-0" disabled={!input.trim() || typing} aria-label="Send message"><Send className="size-4" /></Button></form>
    </Surface>
    <p className="mx-auto max-w-[740px] text-center font-mono text-[9px] leading-relaxed text-muted-foreground">Demonstration only · Responses are examples, not live AI analysis or medical guidance.</p>
  </div>;
}

function DialogShell({ title, subtitle, onClose, children, width = "max-w-[460px]" }: { title: string; subtitle: string; onClose: () => void; children: ReactNode; width?: string }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-label={title} className={cn("max-h-[min(84vh,720px)] w-full overflow-y-auto border border-border bg-instrument shadow-2xl", width)}><div className="flex items-start justify-between gap-4 border-b border-border/70 p-5"><div><h2 className="text-[17px] font-semibold">{title}</h2><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{subtitle}</p></div><Button variant="ghost" size="icon" aria-label="Close" onClick={onClose} className="-mr-2 -mt-2 text-muted-foreground"><X className="size-4" /></Button></div>{children}</section></div>;
}

function LocationDialog({ value, onSelect, onClose }: { value: string; onSelect: (city: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const filtered = citySamples.filter((city) => city.name.toLowerCase().includes(search.toLowerCase()));
  return <DialogShell title="Choose a location" subtitle="Local readings and sample trends will follow your selection." onClose={onClose}><div className="p-5"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search city…" aria-label="Search cities" className="pl-9" /></div><div className="mt-3 space-y-1">{filtered.map((city) => <button key={city.name} onClick={() => onSelect(city.name)} className="flex w-full items-center justify-between gap-3 border border-transparent px-3 py-3 text-left transition-colors hover:border-border/70 hover:bg-background/60"><div className="flex items-center gap-3"><MapPin className="size-4 text-primary"/><div><p className="text-[12px]">{city.name}</p><p className="mt-1 font-mono text-[9px] text-muted-foreground">AQI {city.aqi} · PM2.5 {city.pm25} µg/m³</p></div></div>{value === city.name && <Check className="size-4 text-primary"/>}</button>)}{filtered.length === 0 && <p className="py-7 text-center text-[12px] text-muted-foreground">No sample locations found.</p>}</div><p className="mt-3 border-t border-border/70 pt-3 font-mono text-[9px] text-muted-foreground">City search uses sample locations. GPS and live stations aren't connected.</p></div></DialogShell>;
}

function ActivityDialog({ initialCategory, onClose, onSave }: { initialCategory: string; onClose: () => void; onSave: () => void }) {
  const [category, setCategory] = useState(initialCategory);
  const [distance, setDistance] = useState("8");
  const [vehicle, setVehicle] = useState("Car");
  const [saved, setSaved] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSaved(true); window.setTimeout(onSave, 700); }
  return <DialogShell title="Log activity" subtitle="Add a sample activity to estimate its footprint." onClose={onClose}><form onSubmit={submit} className="space-y-4 p-5"><fieldset><legend className="mb-2 font-mono text-[9px] uppercase tracking-[.13em] text-muted-foreground">Category</legend><div className="flex flex-wrap gap-2">{["Transport", "Electricity", "Food", "Travel", "Other"].map((item) => <button type="button" key={item} onClick={() => setCategory(item)} className={cn("border px-2.5 py-2 text-[10px]", category === item ? "border-primary/35 bg-primary/10 text-primary" : "border-border/70 text-muted-foreground")}>{item}</button>)}</div></fieldset>{category === "Transport" && <><label className="block space-y-2"><span className="font-mono text-[9px] uppercase tracking-[.13em] text-muted-foreground">Vehicle type</span><select value={vehicle} onChange={(event) => setVehicle(event.target.value)} className="h-10 w-full border border-input bg-background px-3 text-[12px]"><option>Car</option><option>Bus</option><option>Motorcycle</option><option>Metro / train</option><option>Bicycle</option></select></label><label className="block space-y-2"><span className="font-mono text-[9px] uppercase tracking-[.13em] text-muted-foreground">Distance travelled (km)</span><Input required min="0.1" max="1000" step="0.1" type="number" value={distance} onChange={(event) => setDistance(event.target.value)} /></label><label className="block space-y-2"><span className="font-mono text-[9px] uppercase tracking-[.13em] text-muted-foreground">Fuel type</span><select className="h-10 w-full border border-input bg-background px-3 text-[12px]"><option>Petrol</option><option>Diesel</option><option>Electric</option><option>Hybrid</option></select></label></>}{category === "Electricity" && <label className="block space-y-2"><span className="font-mono text-[9px] uppercase tracking-[.13em] text-muted-foreground">Energy used (kWh)</span><Input type="number" min="0.1" step="0.1" defaultValue="3"/></label>}{category !== "Transport" && category !== "Electricity" && <label className="block space-y-2"><span className="font-mono text-[9px] uppercase tracking-[.13em] text-muted-foreground">Activity details</span><Input placeholder={`Describe your ${category.toLowerCase()} activity`} /></label>}<div className="border border-primary/15 bg-primary/5 p-3"><p className="font-mono text-[9px] uppercase tracking-[.12em] text-primary">Illustrative estimate</p><p className="mt-1.5 font-mono text-[20px]">~{category === "Transport" ? (vehicle === "Car" ? (Number(distance) * 0.192).toFixed(1) : (Number(distance) * 0.08).toFixed(1)) : "0.6"}<span className="ml-1 text-[10px] text-muted-foreground">kg CO₂e</span></p><p className="mt-1 text-[9px] text-muted-foreground">Mock factors only · actual emission calculation isn't connected.</p></div><Button type="submit" className="w-full gap-2" disabled={saved}>{saved ? <><Check className="size-4"/>Added</> : "Calculate impact"}</Button></form></DialogShell>;
}

function AlertsDialog({ onClose }: { onClose: () => void }) {
  return <DialogShell title="Alerts" subtitle="Environmental updates and personal insights." onClose={onClose}><div className="divide-y divide-border/70 px-5">{environmentalAlerts.map((alert) => <div key={alert.title} className="flex gap-3 py-4"><span className={cn("mt-1.5 size-2 shrink-0 rounded-full", alert.tone === "amber" ? "bg-signal-amber" : alert.tone === "teal" ? "bg-primary" : "bg-signal-blue")}/><div className="flex-1"><p className="text-[12px] font-medium">{alert.title}</p><p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{alert.detail}</p><p className="mt-2 font-mono text-[8px] text-muted-foreground">{alert.time} · SAMPLE ALERT</p></div></div>)}</div><p className="border-t border-border/70 px-5 py-3 font-mono text-[9px] text-muted-foreground">Push notifications aren't connected.</p></DialogShell>;
}

function SettingsDialog({ onClose }: { onClose: () => void }) {
  const [units, setUnits] = useState("Metric");
  const [notifications, setNotifications] = useState(true);
  return <DialogShell title="Settings" subtitle="Your Eco Lens preferences." onClose={onClose}><div className="divide-y divide-border/70 px-5">{[{ icon: "G", label: "Profile", value: "Gourav" }, { icon: "⌖", label: "Location", value: "Bhopal, India" }].map((item) => <div key={item.label} className="flex items-center gap-3 py-4"><span className="grid size-8 place-items-center border border-border/70 font-mono text-xs text-primary">{item.icon}</span><span className="text-[12px]">{item.label}</span><span className="ml-auto text-[11px] text-muted-foreground">{item.value}</span></div>)}<div className="flex items-center gap-3 py-4"><span className="grid size-8 place-items-center border border-border/70"><Gauge className="size-4 text-muted-foreground"/></span><span className="text-[12px]">Units</span><select aria-label="Units" value={units} onChange={(event) => setUnits(event.target.value)} className="ml-auto border border-input bg-background px-2.5 py-1.5 text-[10px]"><option>Metric</option><option>Imperial</option></select></div><label className="flex cursor-pointer items-center gap-3 py-4"><span className="grid size-8 place-items-center border border-border/70"><Bell className="size-4 text-muted-foreground"/></span><span className="text-[12px]">Notifications</span><input type="checkbox" className="ml-auto size-4 accent-primary" checked={notifications} onChange={(event) => setNotifications(event.target.checked)}/></label>{[{ icon: ShieldCheck, title: "Privacy", text: "Sample data stays in this demo." }, { icon: Globe2, title: "About Eco Lens", text: "Understand your footprint. Understand your air." }].map(({ icon: Icon, title, text }) => <div key={title} className="flex items-center gap-3 py-4"><span className="grid size-8 place-items-center border border-border/70"><Icon className="size-4 text-muted-foreground"/></span><div><p className="text-[12px]">{title}</p><p className="mt-1 text-[10px] text-muted-foreground">{text}</p></div></div>)}</div></DialogShell>;
}