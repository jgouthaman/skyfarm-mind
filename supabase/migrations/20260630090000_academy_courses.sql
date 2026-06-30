-- Academy: courses, modules, lessons

CREATE TABLE IF NOT EXISTS public.courses (
  id            uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  slug          text    UNIQUE NOT NULL,
  title         text    NOT NULL,
  description   text,
  level         text,
  price         numeric,
  hours         numeric,
  project_count int,
  vertical      text,
  status        text    DEFAULT 'coming_soon',
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.modules (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id   uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title       text NOT NULL,
  description text,
  order_index int  NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lessons (
  id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id   uuid    REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
  title       text    NOT NULL,
  content     text,
  order_index int     NOT NULL,
  is_free     boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- Public read access
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courses_public_read" ON public.courses FOR SELECT USING (true);
CREATE POLICY "modules_public_read" ON public.modules FOR SELECT USING (true);
CREATE POLICY "lessons_public_read"  ON public.lessons  FOR SELECT USING (true);

-- ── Seed: Drone Design Fundamentals ──────────────────────────────────────────

INSERT INTO public.courses
  (id, slug, title, description, level, price, hours, project_count, vertical, status)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'drone-design-fundamentals',
  'Drone Design Fundamentals',
  'Aerodynamics, frame types, propulsion basics, and payload math — take your first design from zero to BOM.',
  'Beginner',
  1999,
  8,
  5,
  'All verticals',
  'available'
);

INSERT INTO public.modules (id, course_id, title, description, order_index) VALUES
(
  '10000000-0000-0000-0000-000000000001'::uuid,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'Introduction to Autonomous Aerial Platforms',
  'Foundational understanding of what autonomous aerial platforms are, how they differ from remotely piloted drones, and why they matter for India.',
  1
),
(
  '10000000-0000-0000-0000-000000000002'::uuid,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'Frame Types & Aerodynamics',
  'Explore multirotor, fixed-wing, and VTOL frame configurations and the aerodynamic principles that govern each.',
  2
),
(
  '10000000-0000-0000-0000-000000000003'::uuid,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'Propulsion Systems',
  'Motors, ESCs, propellers, and batteries — how to size and match a propulsion stack to your frame and payload.',
  3
),
(
  '10000000-0000-0000-0000-000000000004'::uuid,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'Payload & Weight Budgeting',
  'Calculate thrust-to-weight ratios, budget payload mass, and design for real-world Indian mission profiles.',
  4
),
(
  '10000000-0000-0000-0000-000000000005'::uuid,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'Building Your First BOM',
  'Compile a production-ready Bill of Materials using the TorqWings component database and design tools.',
  5
),
(
  '10000000-0000-0000-0000-000000000006'::uuid,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
  'Introduction to Flight Simulation',
  'Validate your design in TorqWings simulation environment before committing to hardware.',
  6
);

-- ── Seed: Lesson 1.1 (free preview) ─────────────────────────────────────────

INSERT INTO public.lessons (id, module_id, title, content, order_index, is_free) VALUES
(
  '20000000-0000-0000-0000-000000000001'::uuid,
  '10000000-0000-0000-0000-000000000001'::uuid,
  'Introduction to Autonomous Aerial Platforms',
  E'# Introduction to Autonomous Aerial Platforms\n\nWelcome to Drone Design Fundamentals — India''s first structured curriculum for autonomous aerial platform designers. This lesson establishes the conceptual vocabulary you''ll build on throughout the course.\n\n## What is an Autonomous Aerial Platform?\n\nAn **autonomous aerial platform (AAP)** is an unmanned aircraft that can plan and execute flight operations — takeoff, navigation, task performance, and landing — without continuous human control inputs. The platform uses onboard sensors, processing systems, and software algorithms to make real-time decisions within a defined mission envelope.\n\nThis is fundamentally different from a **remotely piloted aircraft (RPA)**, where a human operator provides continuous flight inputs. AAPs operate on *mission logic*: a human defines the objective and the platform executes it.\n\n> You are not training to be a pilot. You are training to be the engineer who designs the platform the autonomous system operates.\n\n## The Four Subsystems Every AAP Designer Must Know\n\nEvery autonomous aerial platform — from a 250 g agricultural sprayer to a 25 kg defence surveillance drone — is built from four interdependent subsystems. Understanding how they affect each other is the foundation of good platform design.\n\n### 1. Airframe\n\nThe physical structure that generates lift, houses all subsystems, and survives the operating environment. Frame geometry (quadrotor, hexarotor, fixed-wing, VTOL hybrid), material selection (carbon fibre, aluminium, injection-moulded polycarbonate), and structural rigidity determine what you can carry, how far you can fly, and what conditions the platform can survive.\n\n### 2. Propulsion System\n\nMotors, electronic speed controllers (ESCs), propellers, and the battery pack that powers them. The propulsion system converts electrical energy into mechanical thrust. Getting propulsion sizing right — matching motor KV rating, propeller pitch and diameter, and battery chemistry to total platform weight — is the single most consequential design decision you will make.\n\n### 3. Avionics & Flight Controller\n\nThe brain of the platform. A flight controller reads sensor data from an IMU (accelerometers and gyroscopes), GPS, barometer, and optionally magnetometers and optical flow sensors. It runs stabilisation and navigation algorithms at update rates of 400–8000 Hz, outputting precise motor commands to hold attitude, track waypoints, and respond to disturbances. Common flight controller stacks used in India include Pixhawk (running ArduPilot or PX4), Cube Orange, and proprietary stacks built for specific verticals.\n\n### 4. Payload & Mission System\n\nThe camera, spray nozzle assembly, LiDAR scanner, thermal sensor, or communication relay that makes the platform operationally useful. Payload design should drive every other subsystem decision — this is the **requirements-first** principle you will practise throughout this course.\n\n## Why India Needs Platform Designers\n\nIndia''s drone economy is growing rapidly across every sector. The bottleneck is not operators — it is **engineers who can design, build, certify, and iterate** platforms suited to Indian conditions, regulations, and mission profiles.\n\nConsider what each vertical demands:\n\n- **AgriSky** — Precision spray drones for paddy, cotton, sugarcane, and horticulture. Variable canopy height, humid conditions, and remote field locations define the design constraints.\n- **InfraSky** — Survey and inspection drones for railways, highways, power transmission corridors, and urban construction. Long range, high-resolution imaging, and BVLOS capability matter here.\n- **GuardSky** — Persistent surveillance platforms for border management, coastal monitoring, and critical infrastructure protection. Extended endurance, low acoustic signature, and encrypted datalinks are the design requirements.\n- **GeoSky** — High-accuracy mapping drones for cadastral surveys, disaster response, and urban planning. Sub-centimetre positioning and systematic coverage patterns define mission success.\n\nA platform designer who understands the fundamentals can develop solutions for any of these verticals.\n\n## The TorqWings Design Workflow\n\nThroughout this course you will follow TorqWings'' **requirements-first workflow**:\n\n1. Define the mission profile — range, endurance, payload mass, and operating environment\n2. Select the frame type that fits the mission geometry\n3. Size the propulsion system by working backwards from all-up weight\n4. Budget the payload and verify thrust-to-weight margin\n5. Generate a production-ready BOM from real component data\n6. Validate the design in simulation before any hardware procurement\n\nThis workflow is implemented directly inside TorqWings Design Studio. By the end of this course you will have completed it end-to-end for a real mission scenario.\n\n---\n\n*Next lesson: Frame Types and the physics of lift — why the geometry of your frame determines more about your drone''s behaviour than any individual component choice.*',
  1,
  true
);
