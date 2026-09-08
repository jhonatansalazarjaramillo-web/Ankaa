const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const DB_PATH = path.join(__dirname, 'Base de datos', 'database.json');

function leerDB() {
  if (!fs.existsSync(DB_PATH)) {
    return { admins: [], horarios: [], citas: [] };
  }
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

function guardarDB(datos) {
  fs.writeFileSync(DB_PATH, JSON.stringify(datos, null, 2), 'utf-8');
}
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Servir archivos estáticos
app.use(express.static(__dirname));
app.use('/Agendar', express.static(path.join(__dirname, 'Agendar')));
app.use('/Katherin web', express.static(path.join(__dirname, 'Katherin web')));

// Redirigir al inicio de la web
app.get('/', (req, res) => {
  res.redirect('/Katherin web/landingpage.html');
});

function leerDB() {
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

function guardarDB(datos) {
  fs.writeFileSync(DB_PATH, JSON.stringify(datos, null, 2), 'utf-8');
}

// 1. Obtener citas
app.get('/api/citas', (req, res) => {
  try {
    const db = leerDB();
    const citasCompletas = db.citas.map(cita => {
      const horario = db.horarios.find(h => h.id === cita.horarioId) || {};
      return { ...cita, horario };
    });
    res.json(citasCompletas);
  } catch (error) {
    res.status(500).json({ error: 'Error al leer citas' });
  }
});

// 2. Guardar cita con método de pago y comprobante
app.post('/api/citas', (req, res) => {
  try {
    const { nombre, telefono, correo, motivo, fecha, hora, metodoPago, comprobante } = req.body;
    const db = leerDB();

    const horarioId = 'horario_' + Date.now();
    const citaId = 'cita_' + Date.now();
    const estadoInicial = metodoPago === 'Nequi' ? 'Pendiente de comprobante' : 'Confirmada';

    const nuevoHorario = {
      id: horarioId,
      fecha: fecha,
      horaInicio: hora,
      horaFin: '',
      estado: 'Ocupado'
    };

    const nuevaCita = {
      id: citaId,
      nombrePaciente: nombre,
      telefono: telefono,
      correo: correo || 'Sin correo',
      motivo: motivo || 'Sin motivo especificado',
      metodoPago: metodoPago,
      comprobante: comprobante || null,
      horarioId: horarioId,
      estado: estadoInicial
    };

    db.horarios.push(nuevoHorario);
    db.citas.push(nuevaCita);
    guardarDB(db);

    res.status(201).json({ mensaje: 'Cita registrada con éxito', cita: nuevaCita });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar la cita' });
  }
});

// 3. Cambiar estado
app.patch('/api/citas/:id/estado', (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const db = leerDB();

    const cita = db.citas.find(c => c.id === id);
    if (!cita) return res.status(404).json({ error: 'Cita no encontrada' });

    cita.estado = estado;
    if (estado === 'Atendida') {
      cita.fechaAtendida = new Date().toISOString().split('T')[0];
    }

    guardarDB(db);
    res.json({ mensaje: 'Estado actualizado', cita });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

// 4. Consultar horas ocupadas por fecha
app.get('/api/horarios-ocupados/:fecha', (req, res) => {
  try {
    const { fecha } = req.params;
    const db = leerDB();
    
    // Filtramos los horarios de esa fecha que ya estén marcados como 'Ocupado'
    const ocupados = db.horarios
      .filter(h => h.fecha === fecha && h.estado === 'Ocupado')
      .map(h => h.horaInicio);
      
    res.json(ocupados);
  } catch (error) {
    res.status(500).json({ error: 'Error al consultar disponibilidad' });
  }
});

app.listen(PORT, () => {
  console.log('\n========================================');
  console.log('       SISTEMA ANKAA EN LÍNEA          ');
  console.log('========================================');
  console.log(`Panel de Katherine: http://localhost:${PORT}/Agendar/admin.html`);
  console.log(`Página de Agendar:  http://localhost:${PORT}/Agendar/agendar.html`);
  console.log(`Web Principal:      http://localhost:${PORT}/`);
  console.log('========================================\n');
});
