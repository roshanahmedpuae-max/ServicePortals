"use client";

interface LandingPageProps {
  onSelectService: (service: "printers-uae" | "g3-facility" | "it-service") => void;
}

export default function LandingPage({ onSelectService }: LandingPageProps) {
  const services = [
    {
      id: "printers-uae" as const,
      name: "Printers UAE",
      description: "Printer Service & Repair",
      gradient: "from-blue-600 via-blue-700 to-indigo-800",
      hoverGradient: "hover:from-blue-700 hover:via-blue-800 hover:to-indigo-900",
      icon: (
        <svg className="w-12 h-12 sm:w-16 sm:h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
      ),
      shadowColor: "shadow-blue-500/30",
      ringColor: "focus:ring-blue-400",
    },
    {
      id: "g3-facility" as const,
      name: "G3 Facility",
      description: "Facility Management Work Orders",
      gradient: "from-emerald-600 via-teal-600 to-cyan-700",
      hoverGradient: "hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-800",
      icon: (
        <svg className="w-12 h-12 sm:w-16 sm:h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      shadowColor: "shadow-emerald-500/30",
      ringColor: "focus:ring-emerald-400",
    },
    {
      id: "it-service" as const,
      name: "IT Service",
      description: "IT Support & Technical Services",
      gradient: "from-purple-600 via-violet-600 to-fuchsia-700",
      hoverGradient: "hover:from-purple-700 hover:via-violet-700 hover:to-fuchsia-800",
      icon: (
        <svg className="w-12 h-12 sm:w-16 sm:h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      shadowColor: "shadow-purple-500/30",
      ringColor: "focus:ring-purple-400",
    },
  ];

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-16 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 mb-6 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3 sm:mb-4 drop-shadow-lg tracking-tight">
            Service Portal
          </h1>
          <p className="text-white/80 text-base sm:text-xl max-w-md mx-auto">
            Select a service to create a new work order
          </p>
        </div>

        {/* Service Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {services.map((service, index) => (
            <button
              key={service.id}
              onClick={() => onSelectService(service.id)}
              className={`
                group relative overflow-hidden
                bg-gradient-to-br ${service.gradient} ${service.hoverGradient}
                rounded-2xl sm:rounded-3xl p-6 sm:p-8
                text-white text-left
                transform transition-all duration-300 ease-out
                hover:scale-105 hover:-translate-y-1
                focus:outline-none focus:ring-4 ${service.ringColor} focus:ring-offset-2 focus:ring-offset-transparent
                shadow-xl ${service.shadowColor} hover:shadow-2xl
                animate-fade-in
              `}
              style={{ animationDelay: `${(index + 1) * 0.1}s` }}
            >
              {/* Background decoration */}
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-white/10 transform group-hover:scale-150 transition-transform duration-500" />
              <div className="absolute bottom-0 left-0 -ml-4 -mb-4 w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-black/10 transform group-hover:scale-125 transition-transform duration-500" />
              
              {/* Content */}
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-2xl bg-white/20 backdrop-blur-sm transform group-hover:scale-110 transition-transform duration-300">
                  {service.icon}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold mb-2 tracking-tight">
                  {service.name}
                </h2>
                <p className="text-sm sm:text-base text-white/80">
                  {service.description}
                </p>
                
                {/* Arrow indicator */}
                <div className="mt-4 sm:mt-6 flex items-center gap-2 text-sm font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                  <span>Open Form</span>
                  <svg 
                    className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-10 sm:mt-16 text-center text-white/50 text-xs sm:text-sm">
          <p>© {new Date().getFullYear()} Professional Service Management</p>
        </footer>
      </div>
    </div>
  );
}

