"""Convierte los sonidos originales en bucles sin cortes (m4a AAC mono) para la app."""
import json, subprocess, sys, os
ORIG, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
FADE = 3.0      # segundos de fundido para empalmar el final con el principio
TARGET = 90.0   # duración aproximada de cada bucle

def dur(f):
    return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f]).decode().strip())

def run(*a):
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y',*a], check=True)

def make_loop(src, name, start=0.0, length=None, extra_filter=''):
    tmp = f'{OUT}/_{name}.wav'
    d = dur(src) - start
    L = min(d, length or d)
    # 1) recorte + mono + volumen homogéneo (EBU R128) a WAV temporal
    run('-ss', str(start), '-t', str(L), '-i', src, '-ac', '1', '-ar', '44100',
        '-af', (extra_filter + ',' if extra_filter else '') + 'loudnorm=I=-23:TP=-3:LRA=11', tmp)
    L = dur(tmp)
    f = min(FADE, L / 4)
    # 2) bucle sin cortes: cabeza = inicio (fade-in) + final (fade-out) mezclados; cuerpo = resto
    seg = f'{OUT}/_{name}_seg.wav'
    fmt = 'aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=mono'
    run('-i', tmp, '-i', tmp, '-i', tmp, '-filter_complex',
        f'[0]{fmt},atrim=0:{f},asetpts=PTS-STARTPTS,afade=t=in:d={f}[h1];'
        f'[1]{fmt},atrim={L-f}:{L},asetpts=PTS-STARTPTS,afade=t=out:d={f}[h2];'
        f'[h1][h2]amix=inputs=2:normalize=0,{fmt}[head];'
        f'[2]{fmt},atrim={f}:{L-f},asetpts=PTS-STARTPTS[body];'
        f'[head][body]concat=n=2:v=0:a=1[out]', '-map', '[out]', seg)
    # 3) repetir el segmento (ya empalma consigo mismo) hasta ~TARGET s
    n = max(1, round(TARGET / dur(seg)))
    run('-stream_loop', str(n - 1), '-i', seg, '-c:a', 'aac', '-b:a', '80k', '-movflags', '+faststart', f'{OUT}/{name}.m4a')
    for p in (tmp, seg):
        os.remove(p)
    print(name, f'{dur(OUT + "/" + name + ".m4a"):.1f}s', f'{os.path.getsize(OUT + "/" + name + ".m4a")//1024}KB')

D = 'duration=75'
SYNTH = {
    # Lluvia: ruido rosa agudo + gotas (ruido blanco filtrado con picos aleatorios)
    'lluvia': ([f'anoisesrc=color=pink:amplitude=0.6:{D}:seed=3', f'anoisesrc=color=white:amplitude=0.5:{D}:seed=5'],
               '[0]highpass=f=400,lowpass=f=9000[a];[1]highpass=f=2500,volume=0.35,'
               "volume='0.6+0.4*gt(random(1),0.97)':eval=frame[b];"
               '[a][b]amix=inputs=2:normalize=0,equalizer=f=3000:t=q:w=1:g=3'),
    # Olas: ruido marrón/rosa con subidas y bajadas lentas (oleaje cada ~8 s)
    'olas': ([f'anoisesrc=color=brown:amplitude=0.8:{D}:seed=9', f'anoisesrc=color=pink:amplitude=0.5:{D}:seed=13'],
             '[0][1]amix=inputs=2:normalize=0,lowpass=f=3500,highpass=f=60,'
             "volume='0.25+0.75*pow(0.5+0.5*sin(2*PI*t/8.3),2)*(0.8+0.2*sin(2*PI*t/23))':eval=frame"),
    # Río: ruido rosa con burbujeo (modulación rápida irregular)
    'rio': ([f'anoisesrc=color=pink:amplitude=0.7:{D}:seed=21', f'anoisesrc=color=white:amplitude=0.3:{D}:seed=23'],
            '[0]bandpass=f=900:width_type=o:w=3[a];[1]bandpass=f=3200:width_type=o:w=1.5,'
            "volume='0.5+0.5*sin(2*PI*t*7.3)*sin(2*PI*t*3.1)':eval=frame[b];"
            "[a][b]amix=inputs=2:normalize=0,volume='0.85+0.15*sin(2*PI*t/5)':eval=frame"),
    # Ventilador: ruido marrón grave + zumbido suave del motor y aspas
    'ventilador': ([f'anoisesrc=color=brown:amplitude=0.7:{D}:seed=31', f'anoisesrc=color=pink:amplitude=0.4:{D}:seed=37',
                    'sine=frequency=100:duration=75', 'sine=frequency=50:duration=75'],
                   '[1]lowpass=f=1800[p];[2]volume=0.03[h1];[3]volume=0.04[h2];'
                   "[0][p][h1][h2]amix=inputs=4:normalize=0,lowpass=f=2500,highpass=f=40,volume='0.92+0.08*sin(2*PI*t*4)':eval=frame"),
}

cfg = json.loads(sys.argv[3])
for name, c in cfg.items():
    if c.get('synth') in SYNTH:
        raw = f'{OUT}/_{name}_raw.wav'
        inputs, graph = SYNTH[c['synth']]
        args = []
        for i in inputs:
            args += ['-f', 'lavfi', '-i', i]
        run(*args, '-filter_complex', graph, '-ac', '1', '-ar', '44100', '-t', '70', raw)
        make_loop(raw, name)
        os.remove(raw)
    elif c.get('synth') == 'secador':
        # Secador sintetizado: ruido rosa + soplido agudo + zumbido del motor
        raw = f'{OUT}/_secador_raw.wav'
        run('-f','lavfi','-i','anoisesrc=color=pink:amplitude=0.55:duration=70:seed=7',
            '-f','lavfi','-i','anoisesrc=color=white:amplitude=0.25:duration=70:seed=11',
            '-f','lavfi','-i','sine=frequency=196:duration=70',
            '-f','lavfi','-i','sine=frequency=392:duration=70',
            '-filter_complex',
            '[1]bandpass=f=2600:width_type=o:w=1.6[w];[2]volume=0.05[s1];[3]volume=0.025[s2];'
            '[0][w][s1][s2]amix=inputs=4:normalize=0,highpass=f=110,lowpass=f=8000,tremolo=f=0.25:d=0.04',
            '-ac','1','-ar','44100', raw)
        make_loop(raw, name)
        os.remove(raw)
    else:
        make_loop(os.path.join(ORIG, c['file']), name, c.get('start', 0.0), c.get('length'), c.get('filter', ''))
