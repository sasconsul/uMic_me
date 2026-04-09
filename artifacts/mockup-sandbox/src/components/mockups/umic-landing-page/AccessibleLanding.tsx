import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Radio, QrCode, Users, Mic, CalendarPlus, Printer, ArrowRight } from "lucide-react";

export function AccessibleLanding() {
  return (
    <div className="min-h-screen bg-background font-sans text-gray-900">
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium outline-none ring-2 ring-primary ring-offset-2"
      >
        Skip to main content
      </a>

      <header className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-md">
            <Radio className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <span className="text-xl font-bold tracking-tight">uMic.me</span>
        </div>
        <nav aria-label="Primary navigation">
          <ul className="flex items-center gap-6">
            <li>
              <a 
                href="#" 
                className="text-base font-medium text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm px-1"
              >
                Demos
              </a>
            </li>
            <li>
              <Button 
                variant="outline" 
                onClick={() => {}}
                className="text-base focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                Sign in
              </Button>
            </li>
          </ul>
        </nav>
      </header>

      <main id="main-content" className="flex-1 focus:outline-none" tabIndex={-1}>
        {/* Hero Section */}
        <section aria-labelledby="hero-heading" className="py-20 px-6 max-w-4xl mx-auto text-center">
          <Badge 
            variant="secondary" 
            className="mb-6 py-1.5 px-4 text-base font-medium bg-blue-50 text-blue-900 hover:bg-blue-100"
          >
            Live Audio Streaming
          </Badge>
          <h1 id="hero-heading" className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-6 leading-tight">
            Stream audio to every seat in the room
          </h1>
          <p className="text-lg md:text-xl text-gray-700 mb-10 leading-relaxed max-w-2xl mx-auto">
            Turn every smartphone into a receiver. Hosts create events and stream audio directly to attendees. The audience joins instantly by scanning a QR code. Everyone hears clearly, and anyone can join the speaking queue to ask questions.
          </p>
          <Button 
            size="lg" 
            onClick={() => {}}
            className="text-lg px-8 py-6 h-auto font-semibold focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label="Create a new host account to start an event"
          >
            Host an Event <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
          </Button>
        </section>

        {/* Audience Section */}
        <section aria-labelledby="audience-heading" className="py-16 px-6 bg-gray-50 border-t border-b border-gray-200">
          <div className="max-w-6xl mx-auto">
            <h2 id="audience-heading" className="text-3xl font-bold text-gray-900 mb-12 text-center">
              For the Audience
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <img 
                    src="/__mockup/images/panel-scanning.png" 
                    alt="A person holding a smartphone to scan a QR code displayed on a screen" 
                    className="w-full h-48 object-cover rounded-md mb-6 border border-gray-100"
                  />
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-100 p-2 rounded-full" aria-hidden="true">
                      <QrCode className="h-6 w-6 text-blue-700" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">QR Code Join</h3>
                  </div>
                  <p className="text-base text-gray-700 leading-relaxed">
                    Attendees do not need to download an app. They scan a QR code at your venue to open the event directly in their web browser.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <img 
                    src="/__mockup/images/panel-listening.png" 
                    alt="An attendee wearing headphones and looking at their phone screen" 
                    className="w-full h-48 object-cover rounded-md mb-6 border border-gray-100"
                  />
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-green-100 p-2 rounded-full" aria-hidden="true">
                      <Radio className="h-6 w-6 text-green-700" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Crystal-Clear Audio</h3>
                  </div>
                  <p className="text-base text-gray-700 leading-relaxed">
                    High-quality audio streams directly to their device. Perfect for large rooms, overflow spaces, or multi-language translation.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <img 
                    src="/__mockup/images/panel-qa.png" 
                    alt="A speaker interface showing a button to raise hand for questions" 
                    className="w-full h-48 object-cover rounded-md mb-6 border border-gray-100"
                  />
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-purple-100 p-2 rounded-full" aria-hidden="true">
                      <Users className="h-6 w-6 text-purple-700" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Q&A Queue</h3>
                  </div>
                  <p className="text-base text-gray-700 leading-relaxed">
                    Audience members can tap to raise their hand. The host sees an organized list and can unmute people to speak to the room.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Host Section */}
        <section aria-labelledby="host-heading" className="py-16 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 id="host-heading" className="text-3xl font-bold text-gray-900 mb-12 text-center">
              Host meeting preparation
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <img 
                    src="/__mockup/images/host-setup.png" 
                    alt="A computer screen showing the dashboard to create a new live event" 
                    className="w-full h-48 object-cover rounded-md mb-6 border border-gray-100"
                  />
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-orange-100 p-2 rounded-full" aria-hidden="true">
                      <CalendarPlus className="h-6 w-6 text-orange-700" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Event Setup</h3>
                  </div>
                  <p className="text-base text-gray-700 leading-relaxed">
                    Log in to your host dashboard. Create your event ahead of time with a title and date to get your joining codes ready.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <img 
                    src="/__mockup/images/host-flyer.jpg" 
                    alt="A printed paper flyer with a large QR code and instructions to join the audio" 
                    className="w-full h-48 object-cover rounded-md mb-6 border border-gray-100"
                  />
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-teal-100 p-2 rounded-full" aria-hidden="true">
                      <Printer className="h-6 w-6 text-teal-700" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Print a Flyer</h3>
                  </div>
                  <p className="text-base text-gray-700 leading-relaxed">
                    Download a ready-to-print PDF flyer. It includes your event's unique QR code and simple instructions for your attendees.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-sm">
                <CardContent className="p-6">
                  <img 
                    src="/__mockup/images/host-pa.jpg" 
                    alt="Audio equipment connecting a laptop to a professional sound system" 
                    className="w-full h-48 object-cover rounded-md mb-6 border border-gray-100"
                  />
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-indigo-100 p-2 rounded-full" aria-hidden="true">
                      <Mic className="h-6 w-6 text-indigo-700" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">PA Integration</h3>
                  </div>
                  <p className="text-base text-gray-700 leading-relaxed">
                    Connect a device to your venue's sound system. When attendees speak in the Q&A, their voices will play through the room speakers.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-white py-12 px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Radio className="h-6 w-6" aria-hidden="true" />
          <span className="text-xl font-bold tracking-tight">uMic.me</span>
        </div>
        <p className="text-base text-gray-300">
          Making live audio accessible for everyone in the room.
        </p>
      </footer>
    </div>
  );
}
