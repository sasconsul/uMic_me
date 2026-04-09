import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Radio, QrCode, Users, Mic, CalendarPlus, Printer, ArrowRight, CheckCircle2 } from "lucide-react";

export function HierarchyLanding() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
              <Mic className="h-5 w-5" />
            </div>
            <span className="font-bold text-xl tracking-tight">uMic.me</span>
          </div>
          <nav className="flex items-center gap-6">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground hidden sm:inline-flex" onClick={() => {}}>
              Demos
            </Button>
            <Button variant="outline" onClick={() => {}}>
              Sign in
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section - Host Focused */}
        <section className="relative overflow-hidden pt-24 pb-32 lg:pt-36 lg:pb-40">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
          
          <div className="container mx-auto px-4 text-center max-w-4xl">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium rounded-full border bg-background/50 backdrop-blur-sm">
              <Radio className="w-4 h-4 mr-2 text-primary animate-pulse" />
              Real-time live event platform
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 text-balance leading-[1.1]">
              Stream audio to <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">every seat</span> in the room.
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed text-balance">
              Turn your audience's smartphones into personal receivers and interactive microphones. No extra hardware required.
            </p>
            
            <div className="flex flex-col items-center gap-4">
              <p className="font-medium italic text-muted-foreground">Sign in now to host your live event:</p>
              <Button size="lg" className="h-16 px-10 text-lg rounded-full shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-105 active:scale-95" onClick={() => {}}>
                Host an Event <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* Primary Section: Host Features */}
        <section className="py-24 bg-card border-y">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Everything you need to run the room</h2>
              <p className="text-lg text-muted-foreground">Professional tools to manage your event audio, right from your browser.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Event Setup */}
              <div className="group relative">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden mb-6 border bg-muted/50">
                  <img 
                    src="/__mockup/images/host-setup.png" 
                    alt="Event Setup Interface" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-xl shrink-0">
                    <CalendarPlus className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Instant Setup</h3>
                    <p className="text-muted-foreground leading-relaxed">Create your event in seconds. Generate a unique link and QR code instantly.</p>
                  </div>
                </div>
              </div>

              {/* Print Flyer */}
              <div className="group relative">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden mb-6 border bg-muted/50">
                  <img 
                    src="/__mockup/images/host-flyer.jpg" 
                    alt="Printable QR Code Flyer" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-xl shrink-0">
                    <Printer className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Branded Materials</h3>
                    <p className="text-muted-foreground leading-relaxed">Download and print professional flyers with your event's join codes.</p>
                  </div>
                </div>
              </div>

              {/* PA Integration */}
              <div className="group relative">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden mb-6 border bg-muted/50">
                  <img 
                    src="/__mockup/images/host-pa.jpg" 
                    alt="PA System Integration" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-xl shrink-0">
                    <Radio className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">PA System Ready</h3>
                    <p className="text-muted-foreground leading-relaxed">Connect a dedicated receiver to feed high-quality audio directly to the room's PA.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Secondary Section: Audience Experience */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-2xl font-bold tracking-tight mb-3">What your audience experiences</h2>
              <p className="text-muted-foreground">A frictionless, app-free experience for everyone in the room.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <Card className="bg-background/50 border-muted/50 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="aspect-square rounded-xl overflow-hidden mb-5 bg-muted">
                    <img 
                      src="/__mockup/images/panel-scanning.png" 
                      alt="Scanning QR Code" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <QrCode className="w-5 h-5 text-muted-foreground" />
                    <h4 className="font-semibold text-lg">Scan to Join</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">No app downloads. Attendees just scan a QR code and they're in.</p>
                </CardContent>
              </Card>

              <Card className="bg-background/50 border-muted/50 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="aspect-square rounded-xl overflow-hidden mb-5 bg-muted">
                    <img 
                      src="/__mockup/images/panel-listening.png" 
                      alt="Listening to Audio" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <Radio className="w-5 h-5 text-muted-foreground" />
                    <h4 className="font-semibold text-lg">Crystal-Clear Audio</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">Low-latency audio streams directly to their personal devices and headphones.</p>
                </CardContent>
              </Card>

              <Card className="bg-background/50 border-muted/50 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="aspect-square rounded-xl overflow-hidden mb-5 bg-muted">
                    <img 
                      src="/__mockup/images/panel-qa.png" 
                      alt="Q&A Queue" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <h4 className="font-semibold text-lg">Live Q&A Queue</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">Digital hand-raising puts them in line to speak directly to the room.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-24">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold tracking-tight mb-8">Ready to upgrade your live events?</h2>
            <Button size="lg" className="h-14 px-8 rounded-full text-base" onClick={() => {}}>
              Create your free account
            </Button>
          </div>
        </section>
      </main>

      <footer className="py-8 border-t text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} uMic.me. All rights reserved.</p>
      </footer>
    </div>
  );
}
