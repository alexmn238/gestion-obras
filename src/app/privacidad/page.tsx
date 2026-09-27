import Link from 'next/link';

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 p-6 max-w-3xl mx-auto space-y-6">
      <header className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white">Aviso Legal y Política de Privacidad</h1>
        <p className="text-xs text-slate-500 mt-1">Última actualización: Septiembre 2026</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">1. Información del Responsable del Tratamiento</h2>
        <p className="text-sm leading-relaxed">
          En cumplimiento del artículo 10 de la Ley 34/2002 (LSSI-CE) y del RGPD (UE) 2016/679, se informa de que el responsable del tratamiento de los datos en esta plataforma es:
        </p>
        <ul className="list-disc list-inside text-sm space-y-1 pl-2 text-slate-400">
          <li><strong>Nombre / Razón Social:</strong> [Nombre de tu Empresa o Nombre y Apellidos si eres Autónomo]</li>
          <li><strong>NIF / CIF:</strong> [Tu NIF o CIF]</li>
          <li><strong>Domicilio Social:</strong> [Dirección física completa]</li>
          <li><strong>Correo electrónico de contacto:</strong> [Email de soporte/contacto]</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">2. Finalidad del Tratamiento de Datos</h2>
        <p className="text-sm leading-relaxed">
          Los datos personales gestionados en esta aplicación (credenciales de acceso de trabajadores, identificadores de obras y registros fotográficos del estado de las instalaciones) se tratan exclusivamente con las siguientes finalidades:
        </p>
        <ul className="list-disc list-inside text-sm space-y-1 pl-2 text-slate-400">
          <li>Gestionar la autenticación y el control de acceso del personal autorizado.</li>
          <li>Documentar y comunicar de forma privada la evolución y partes diarios de las obras activas a los clientes correspondientes.</li>
          <li>Garantizar la seguridad y auditoría técnica de la plataforma.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">3. Uso de Fotografías e Imágenes</h2>
        <p className="text-sm leading-relaxed">
          Las fotografías subidas a través de la plataforma tienen como **único propósito mostrar el avance técnico y material de los inmuebles en reforma o construcción**. Queda estrictamente prohibida la captura y publicación de imágenes donde aparezcan rostros de personas, clientes, trabajadores o terceros, salvaguardando en todo momento el derecho a la propia imagen y la intimidad personal.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">4. Confidencialidad y Destinatarios</h2>
        <p className="text-sm leading-relaxed">
          Los datos asociados a cada obra son accesibles **únicamente por el cliente titular del inmueble mediante su enlace privado de referencia, el trabajador asignado a la obra y el personal de administración**. No se cederán datos a terceros salvo obligación legal o prestación del servicio de infraestructura en la nube (Supabase / Vercel), bajo acuerdos de confidencialidad y procesamiento conforme a la UE.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">5. Derechos del Usuario (ARCO / RGPD)</h2>
        <p className="text-sm leading-relaxed">
          Los usuarios pueden ejercitar sus derechos de acceso, rectificación, supresión, limitación del tratamiento y portabilidad enviando un correo electrónico a <strong>[Email de soporte/contacto]</strong> adjuntando una copia de su documento de identidad.
        </p>
      </section>

      <footer className="border-t border-slate-800 pt-6 text-center">
        <Link href="/" className="text-sm text-blue-400 hover:underline">
          ← Volver a la página principal
        </Link>
      </footer>
    </div>
  );
}