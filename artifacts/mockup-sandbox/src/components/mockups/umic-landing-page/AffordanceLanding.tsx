import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Mic, 
  Radio, 
  QrCode, 
  Users, 
  CalendarPlus, 
  Printer, 
  ArrowRight,
  PlayCircle
} from "lucide-react";

export function AffordanceLanding() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-primary cursor-pointer hover:opacity-80 transition-opacity">
            <Mic className="h-6 w-6" />
            <span>uMic.me</span>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline transition-colors">
              Demos
            </a>
            <Button variant="outline" onClick={() => {}} className="shadow-sm hover:shadow transition-all font-semibold">
              Sign in
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-24 md:py-32 flex flex-col items-center text-center space-y-8">
          <Badge variant="secondary" className="px-4 py-1.5 text-sm font-medium rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-default">
            <Radio className="w-4 h-4 mr-2 inline-block animate-pulse" />
            Live Audio Broadcasting
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-4xl leading-tight">
            Stream audio to <span className="text-primary underline decoration-primary/30 underline-offset-8">every seat</span> in the room
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
            Turn every smartphone into a receiver. Hosts stream crystal-clear audio to attendees and PA systems via WebRTC, complete with a managed Q&A queue.
          </p>

          <div className="flex flex-col items-center w-full max-w-md pt-4">
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
              <Button 
                size="lg" 
                onClick={() => {}}
                className="text-base font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all sm:w-auto w-full group"
              >
                Host an Event
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                onClick={() => {}}
                className="text-base font-semibold border-2 hover:bg-muted/50 transition-colors sm:w-auto w-full group"
              >
                <PlayCircle className="mr-2 h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                See how it works
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4 font-medium flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
              No account needed for attendees. Hosts sign in free.
            </p>
          </div>
        </section>

        {/* For the Audience Section */}
        <section className="bg-slate-50/50 border-y py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">For the Audience</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Seamless listening experience without downloading any apps.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Card 1 */}
              <Card className="overflow-hidden border-2 border-transparent hover:border-primary/20 hover:shadow-lg transition-all group cursor-pointer">
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  <img src="/__mockup/images/panel-scanning.png" alt="Scanning QR Code" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                </div>
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Scan to Join</h3>
                  <p className="text-muted-foreground">Attendees simply scan a QR code at their table or on the presentation screen to join instantly.</p>
                </CardContent>
              </Card>

              {/* Card 2 */}
              <Card className="overflow-hidden border-2 border-transparent hover:border-primary/20 hover:shadow-lg transition-all group cursor-pointer">
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  <img src="/__mockup/images/panel-listening.png" alt="Crystal-Clear Audio" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                </div>
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
                    <Radio className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Crystal-Clear Audio</h3>
                  <p className="text-muted-foreground">Listen through personal headphones via low-latency WebRTC streaming, perfect for translation or accessibility.</p>
                </CardContent>
              </Card>

              {/* Card 3 */}
              <Card className="overflow-hidden border-2 border-transparent hover:border-primary/20 hover:shadow-lg transition-all group cursor-pointer">
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  <img src="/__mockup/images/panel-qa.png" alt="Q&A Queue" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                </div>
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Interactive Q&A</h3>
                  <p className="text-muted-foreground">Raise your digital hand to join the speaker queue. The host manages who speaks and when.</p>
                </CardContent>
              </Card>
            </div>

            <div className="mt-12 flex justify-center">
              <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/5 group font-semibold text-base">
                See attendee experience details
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </section>

        {/* Host Meeting Preparation Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Host Preparation</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Everything you need to set up and run a professional live audio event.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Card 1 */}
              <Card className="overflow-hidden border-2 border-transparent hover:border-primary/20 hover:shadow-lg transition-all group cursor-pointer">
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  <img src="/__mockup/images/host-setup.png" alt="Event Setup" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                </div>
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
                    <CalendarPlus className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Quick Event Setup</h3>
                  <p className="text-muted-foreground">Create your event in seconds. Get your unique URL and QR code instantly to share with your audience.</p>
                </CardContent>
              </Card>

              {/* Card 2 */}
              <Card className="overflow-hidden border-2 border-transparent hover:border-primary/20 hover:shadow-lg transition-all group cursor-pointer">
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  <img src="/__mockup/images/host-flyer.jpg" alt="Print a Flyer" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                </div>
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
                    <Printer className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Printable Flyers</h3>
                  <p className="text-muted-foreground">Generate and print professional table tents and flyers with your event's QR code built right in.</p>
                </CardContent>
              </Card>

              {/* Card 3 */}
              <Card className="overflow-hidden border-2 border-transparent hover:border-primary/20 hover:shadow-lg transition-all group cursor-pointer">
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  <img src="/__mockup/images/host-pa.jpg" alt="PA Integration" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                </div>
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
                    <Mic className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">PA System Integration</h3>
                  <p className="text-muted-foreground">Connect a dedicated device to the room's PA system to broadcast audience questions securely.</p>
                </CardContent>
              </Card>
            </div>

            <div className="mt-12 flex justify-center">
              <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/5 group font-semibold text-base">
                Explore all host features
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Simple Footer */}
      <footer className="border-t py-12 bg-slate-50">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-muted-foreground">
          <div className="flex items-center gap-2 font-bold text-lg text-foreground">
            <Mic className="h-5 w-5" />
            <span>uMic.me</span>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} uMic.me. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default AffordanceLanding;
