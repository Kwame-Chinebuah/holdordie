import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  StatusBar,
  Animated,
  Platform,
  Share,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AdBanner from '../components/AdBanner';
import KwamKittBadge from '../components/KwamKittBadge';
import { COLORS } from '../data/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const GRAVITY = 0.42;
const PIPE_WIDTH = 52;
const GAP_HEIGHT = 160;
const BIRD_SIZE = 30;
const GROUND_H = 60;
const AD_BANNER_H = 50;
const KWAMKITT_H = 24;
const BOTTOM_BAR_H = AD_BANNER_H + KWAMKITT_H;
const CANVAS_H = SCREEN_H - BOTTOM_BAR_H - (Platform.OS === 'android' ? 24 : 44);
const CANVAS_W = SCREEN_W;
const OVERCHARGE_MAX = 100;
const PIPE_SPACING = 240;

function makePipe(x) {
  const minTop = 80;
  const maxTop = CANVAS_H - GROUND_H - GAP_HEIGHT - 80;
  const topH = Math.random() * (maxTop - minTop) + minTop;
  return { x, topH, scored: false, id: Math.random() };
}

function createInitialState() {
  return {
    phase: 'idle',
    bird: { y: CANVAS_H / 2, vy: 0 },
    pipes: [],
    charge: 0,
    holding: false,
    score: 0,
    speed: 2.6,
    frame: 0,
    particles: [],
    shake: { x: 0, y: 0 },
    deathReason: '',
    wobble: 0,
  };
}

export default function GameScreen() {
  const [uiPhase, setUiPhase] = useState('idle');
  const [uiScore, setUiScore] = useState(0);
  const [uiBest, setUiBest] = useState(0);
  const [deathMsg, setDeathMsg] = useState('');

  const gs = useRef(createInitialState());
  const bestRef = useRef(0);
  const rafRef = useRef(null);

  const birdY = useRef(new Animated.Value(CANVAS_H / 2)).current;
  const birdRotate = useRef(new Animated.Value(0)).current;
  const birdGlowOpacity = useRef(new Animated.Value(0)).current;
  const chargeWidth = useRef(new Animated.Value(0)).current;
  const chargeBarOpacity = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;

  const MAX_PIPES = 4;
  const pipeSlots = useRef(
    Array.from({ length: MAX_PIPES }, () => ({
      x: new Animated.Value(CANVAS_W + 100),
      topH: new Animated.Value(120),
      visible: new Animated.Value(0),
    }))
  ).current;

  const [particles, setParticles] = useState([]);
  const particleRef = useRef([]);

  useEffect(() => {
    AsyncStorage.getItem('holdordie_best').then(val => {
      if (val) {
        const n = parseInt(val, 10);
        bestRef.current = n;
        setUiBest(n);
      }
    });
  }, []);

  const die = useCallback((reason) => {
    const s = gs.current;
    s.phase = 'dead';
    s.deathReason = reason;

    const px = CANVAS_W * 0.25;
    const py = s.bird.y;
    const color = reason === 'overcharge' ? '#ff6600' : '#ff2244';
    const newParticles = Array.from({ length: 18 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 18;
      const spd = 3 + Math.random() * 5;
      return {
        id: Math.random(),
        x: px, y: py,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 3,
        life: 1,
        color,
        size: 4 + Math.random() * 4,
      };
    });
    particleRef.current = newParticles;
    setParticles([...newParticles]);

    Animated.sequence([
      Animated.timing(shakeX, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();

    const finalScore = s.score;
    if (finalScore > bestRef.current) {
      bestRef.current = finalScore;
      AsyncStorage.setItem('holdordie_best', String(finalScore));
      setUiBest(finalScore);
    }
    setUiScore(finalScore);
    const msgs = {
      overcharge: '⚡ OVERCHARGED',
      ground: '💀 HIT THE GROUND',
      ceiling: '🔼 HIT THE CEILING',
      pipe: '🟩 HIT A PIPE',
    };
    setDeathMsg(msgs[reason] || 'DEAD');
    setUiPhase('dead');
    chargeBarOpacity.setValue(0);
  }, [shakeX, chargeBarOpacity]);

  const startGame = useCallback(() => {
    const s = gs.current;
    s.phase = 'playing';
    s.bird = { y: CANVAS_H * 0.45, vy: 0 };
    s.pipes = [
      makePipe(CANVAS_W + 60),
      makePipe(CANVAS_W + 60 + PIPE_SPACING),
      makePipe(CANVAS_W + 60 + PIPE_SPACING * 2),
    ];
    s.charge = 0;
    s.holding = false;
    s.score = 0;
    s.speed = 2.6;
    s.frame = 0;
    s.wobble = 0;
    particleRef.current = [];
    setParticles([]);
    setUiScore(0);
    setDeathMsg('');
    setUiPhase('playing');

    birdY.setValue(s.bird.y);
    birdRotate.setValue(0);
    chargeWidth.setValue(0);
    chargeBarOpacity.setValue(0);

    s.pipes.forEach((p, i) => {
      pipeSlots[i].x.setValue(p.x);
      pipeSlots[i].topH.setValue(p.topH);
      pipeSlots[i].visible.setValue(1);
    });
    for (let i = s.pipes.length; i < MAX_PIPES; i++) {
      pipeSlots[i].visible.setValue(0);
    }
  }, [birdY, birdRotate, chargeWidth, chargeBarOpacity, pipeSlots]);

  const handlePressIn = useCallback(() => {
    const s = gs.current;
    if (s.phase === 'idle' || s.phase === 'dead') {
      startGame();
      return;
    }
    s.holding = true;
    chargeBarOpacity.setValue(1);
  }, [startGame, chargeBarOpacity]);

  const handlePressOut = useCallback(() => {
    const s = gs.current;
    if (s.phase !== 'playing') return;
    if (s.holding && s.charge > 0) {
      const force = -(s.charge / OVERCHARGE_MAX) * 15 - 2.5;
      s.bird.vy = force;
      s.wobble = 10;
    }
    s.holding = false;
    s.charge = 0;
    chargeWidth.setValue(0);
    chargeBarOpacity.setValue(0);
  }, [chargeWidth, chargeBarOpacity]);

  const handleShare = useCallback(async () => {
    const score = gs.current.score || uiScore;
    try {
      await Share.share({
        message: `I scored ${score} on Hold or Die! 🔥 Can you beat me?\n\nHold to charge, release to fly — don't overcharge or you explode 💥\n\nDownload: https://play.google.com/store/apps/details?id=com.kwamkitt.holdordie`,
        title: 'Hold or Die',
      });
    } catch (e) {}
  }, [uiScore]);

  useEffect(() => {
    let lastTime = 0;

    const tick = (time) => {
      const s = gs.current;
      const dt = Math.min((time - lastTime) / 16.67, 2);
      lastTime = time;

      if (s.phase === 'playing') {
        s.frame++;
        s.speed = 2.6 + s.score * 0.07;

        if (s.holding) {
          s.charge = Math.min(s.charge + 1.6 * dt, OVERCHARGE_MAX);
          if (s.charge >= OVERCHARGE_MAX) {
            die('overcharge');
            rafRef.current = requestAnimationFrame(tick);
            return;
          }
          chargeWidth.setValue((s.charge / OVERCHARGE_MAX) * (CANVAS_W - 48));
        }

        if (!s.holding) {
          s.bird.vy += GRAVITY * dt;
          s.bird.y += s.bird.vy * dt;
        } else {
          s.bird.vy *= 0.88;
          s.bird.y += s.bird.vy * 0.3 * dt;
        }
        if (s.wobble > 0) s.wobble = Math.max(0, s.wobble - 0.5 * dt);

        birdY.setValue(s.bird.y);

        const angle = s.holding ? -0.25 : Math.min(0.7, s.bird.vy * 0.055);
        birdRotate.setValue(angle);

        const glow = s.holding ? s.charge / OVERCHARGE_MAX : 0;
        birdGlowOpacity.setValue(glow);

        if (s.bird.y > CANVAS_H - GROUND_H - BIRD_SIZE * 0.5) { die('ground'); rafRef.current = requestAnimationFrame(tick); return; }
        if (s.bird.y < BIRD_SIZE * 0.5) { die('ceiling'); rafRef.current = requestAnimationFrame(tick); return; }

        const bLeft = CANVAS_W * 0.25 - BIRD_SIZE * 0.4;
        const bRight = CANVAS_W * 0.25 + BIRD_SIZE * 0.4;
        const bTop = s.bird.y - BIRD_SIZE * 0.4;
        const bBottom = s.bird.y + BIRD_SIZE * 0.4;

        for (let i = 0; i < s.pipes.length; i++) {
          const p = s.pipes[i];
          p.x -= s.speed * dt;

          if (i < MAX_PIPES) pipeSlots[i].x.setValue(p.x);

          if (!p.scored && p.x + PIPE_WIDTH < CANVAS_W * 0.25) {
            p.scored = true;
            s.score++;
            setUiScore(s.score);
          }

          if (bRight > p.x && bLeft < p.x + PIPE_WIDTH) {
            if (bTop < p.topH || bBottom > p.topH + GAP_HEIGHT) {
              die('pipe'); rafRef.current = requestAnimationFrame(tick); return;
            }
          }
        }

        const before = s.pipes.length;
        s.pipes = s.pipes.filter(p => p.x > -PIPE_WIDTH - 20);
        if (s.pipes.length < before) {
          for (let i = s.pipes.length; i < MAX_PIPES; i++) pipeSlots[i].visible.setValue(0);
        }

        const last = s.pipes[s.pipes.length - 1];
        if (!last || last.x < CANVAS_W - PIPE_SPACING + 20) {
          const newPipe = makePipe(CANVAS_W + 40);
          s.pipes.push(newPipe);
          const slotIdx = s.pipes.length - 1;
          if (slotIdx < MAX_PIPES) {
            pipeSlots[slotIdx].x.setValue(newPipe.x);
            pipeSlots[slotIdx].topH.setValue(newPipe.topH);
            pipeSlots[slotIdx].visible.setValue(1);
          }
        }

        s.pipes.forEach((p, i) => {
          if (i < MAX_PIPES) {
            pipeSlots[i].x.setValue(p.x);
            pipeSlots[i].topH.setValue(p.topH);
            pipeSlots[i].visible.setValue(1);
          }
        });

        if (particleRef.current.length > 0) {
          let changed = false;
          particleRef.current = particleRef.current
            .map(p => {
              const np = { ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.2, vx: p.vx * 0.97, life: p.life - 0.025 };
              if (Math.abs(np.x - p.x) > 0.1) changed = true;
              return np;
            })
            .filter(p => p.life > 0);
          if (changed) setParticles([...particleRef.current]);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [die, birdY, birdRotate, birdGlowOpacity, chargeWidth, pipeSlots]);

  const birdRotateStr = birdRotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-57.3deg', '57.3deg'],
  });

  const chargeColor = chargeWidth.interpolate({
    inputRange: [0, (CANVAS_W - 48) * 0.7, CANVAS_W - 48],
    outputRange: ['#44ff44', '#ffaa00', '#ff2244'],
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* ── Game area (pressable) ── */}
      <Pressable
        style={styles.gameArea}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={[styles.gameContent, { transform: [{ translateX: shakeX }] }]}>

          {/* Stars */}
          <View style={styles.starField} pointerEvents="none">
            {STARS.map(s => (
              <View key={s.id} style={[styles.star, { left: s.x, top: s.y, width: s.r * 2, height: s.r * 2, borderRadius: s.r }]} />
            ))}
          </View>

          {/* Pipes */}
          {pipeSlots.map((slot, i) => (
            <Animated.View key={i} style={[styles.pipeContainer, { left: slot.x, opacity: slot.visible }]} pointerEvents="none">
              <Animated.View style={[styles.pipeTop, { height: slot.topH }]}>
                <View style={styles.pipeCap} />
              </Animated.View>
              <Animated.View style={[styles.pipeBottom, { top: Animated.add(slot.topH, new Animated.Value(GAP_HEIGHT)), height: CANVAS_H }]}>
                <View style={[styles.pipeCap, styles.pipeCapBottom]} />
              </Animated.View>
            </Animated.View>
          ))}

          {/* Ground */}
          <View style={styles.ground} pointerEvents="none">
            <View style={styles.groundLine} />
          </View>

          {/* Bird glow */}
          <Animated.View style={[styles.birdGlow, { top: Animated.add(birdY, new Animated.Value(-BIRD_SIZE)), opacity: birdGlowOpacity }]} pointerEvents="none" />

          {/* Bird */}
          <Animated.View style={[styles.bird, { top: Animated.add(birdY, new Animated.Value(-BIRD_SIZE / 2)), transform: [{ rotate: birdRotateStr }] }]} pointerEvents="none">
            <View style={styles.birdBody}>
              <View style={styles.birdWing} />
              <View style={styles.birdEye}>
                <View style={styles.birdEyeShine} />
              </View>
              <View style={styles.birdBeak} />
            </View>
          </Animated.View>

          {/* Particles */}
          {particles.map(p => (
            <View key={p.id} style={[styles.particle, { left: p.x - p.size / 2, top: p.y - p.size / 2, width: p.size * p.life, height: p.size * p.life, borderRadius: p.size, backgroundColor: p.color, opacity: p.life }]} pointerEvents="none" />
          ))}

          {/* Charge bar */}
          <Animated.View style={[styles.chargeBarWrap, { opacity: chargeBarOpacity }]} pointerEvents="none">
            <Text style={styles.chargeLabel}>CHARGING</Text>
            <View style={styles.chargeBarBg}>
              <Animated.View style={[styles.chargeBarFill, { width: chargeWidth, backgroundColor: chargeColor }]} />
              <View style={[styles.dangerMark, { left: (CANVAS_W - 48) * 0.85 }]} />
            </View>
          </Animated.View>

          {/* In-game score */}
          {uiPhase === 'playing' && (
            <View style={styles.scoreBox} pointerEvents="none">
              <Text style={styles.scoreText}>{uiScore}</Text>
            </View>
          )}

          {/* IDLE overlay */}
          {uiPhase === 'idle' && (
            <View style={styles.overlay} pointerEvents="none">
              <Text style={styles.titleTop}>HOLD</Text>
              <Text style={styles.titleBottom}>OR DIE</Text>
              <View style={styles.divider} />
              <Text style={styles.instrText}>Hold screen → charge power</Text>
              <Text style={styles.instrText}>Release → launch up</Text>
              <Text style={[styles.instrText, { color: COLORS.accent, marginTop: 4 }]}>Don't overcharge!</Text>
              <Text style={styles.tapStart}>TAP TO START</Text>
            </View>
          )}

          {/* DEAD overlay */}
          {uiPhase === 'dead' && (
            <View style={styles.overlay}>
              <Text style={styles.youDied}>YOU DIED</Text>
              <Text style={styles.deathMsg}>{deathMsg}</Text>
              <View style={styles.scoreCard}>
                <View style={styles.scoreCardCol}>
                  <Text style={styles.scoreCardLabel}>SCORE</Text>
                  <Text style={styles.scoreCardVal}>{uiScore}</Text>
                </View>
                <View style={styles.scoreCardDivider} />
                <View style={styles.scoreCardCol}>
                  <Text style={styles.scoreCardLabel}>BEST</Text>
                  <Text style={[styles.scoreCardVal, { color: '#ffdd44' }]}>{uiBest}</Text>
                </View>
              </View>

              {/* Share button */}
              <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                <Text style={styles.shareBtnText}>📤  SHARE MY SCORE</Text>
              </TouchableOpacity>

              <Text style={styles.tapRetry}>TAP ANYWHERE TO RETRY</Text>
            </View>
          )}

        </Animated.View>
      </Pressable>

      {/* ── Bottom bar: Ad on top, KwamKitt beneath ── */}
      <View style={styles.bottomBar}>
        <AdBanner />
        <KwamKittBadge />
      </View>
    </View>
  );
}

const STARS = Array.from({ length: 50 }, (_, i) => ({
  id: i,
  x: (i * 137.5) % CANVAS_W,
  y: (i * 73.1) % (CANVAS_H - GROUND_H),
  r: 0.5 + (i % 3) * 0.5,
}));

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  gameArea: {
    flex: 1,
    overflow: 'hidden',
  },
  gameContent: {
    flex: 1,
    backgroundColor: COLORS.bg,
    overflow: 'hidden',
  },

  // Bottom bar
  bottomBar: {
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,100,34,0.15)',
  },

  starField: { ...StyleSheet.absoluteFillObject },
  star: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.55)' },

  pipeContainer: { position: 'absolute', top: 0, width: PIPE_WIDTH, height: CANVAS_H },
  pipeTop: { position: 'absolute', top: 0, width: PIPE_WIDTH, backgroundColor: '#1f4f1f', borderBottomLeftRadius: 4, borderBottomRightRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  pipeBottom: { position: 'absolute', width: PIPE_WIDTH, backgroundColor: '#1f4f1f', borderTopLeftRadius: 4, borderTopRightRadius: 4, overflow: 'hidden' },
  pipeCap: { width: PIPE_WIDTH + 10, height: 20, backgroundColor: '#2d7a2d', marginLeft: -5, borderRadius: 3 },
  pipeCapBottom: { position: 'absolute', top: 0 },

  ground: { position: 'absolute', bottom: 0, left: 0, right: 0, height: GROUND_H, backgroundColor: '#16213e', justifyContent: 'flex-start' },
  groundLine: { height: 2, backgroundColor: '#2a2a5a' },

  birdGlow: { position: 'absolute', left: CANVAS_W * 0.25 - BIRD_SIZE, width: BIRD_SIZE * 2, height: BIRD_SIZE * 2, borderRadius: BIRD_SIZE, backgroundColor: '#ff6600' },
  bird: { position: 'absolute', left: CANVAS_W * 0.25 - BIRD_SIZE / 2, width: BIRD_SIZE, height: BIRD_SIZE },
  birdBody: { width: BIRD_SIZE, height: BIRD_SIZE, borderRadius: BIRD_SIZE / 2, backgroundColor: '#f9e04b', overflow: 'visible' },
  birdWing: { position: 'absolute', width: 14, height: 9, borderRadius: 5, backgroundColor: '#f0c020', bottom: 4, left: 4, transform: [{ rotate: '-15deg' }] },
  birdEye: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#1a1a2e', top: 6, right: 4 },
  birdEyeShine: { position: 'absolute', width: 3, height: 3, borderRadius: 2, backgroundColor: 'white', top: 1, right: 1 },
  birdBeak: { position: 'absolute', width: 8, height: 5, backgroundColor: '#ff8c00', right: -6, top: 11, borderRadius: 2, transform: [{ skewY: '10deg' }] },

  particle: { position: 'absolute' },

  chargeBarWrap: { position: 'absolute', bottom: GROUND_H + 16, left: 24, right: 24 },
  chargeLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontFamily: 'monospace', letterSpacing: 2, marginBottom: 4 },
  chargeBarBg: { height: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'visible' },
  chargeBarFill: { height: '100%', borderRadius: 6 },
  dangerMark: { position: 'absolute', top: -4, width: 2, height: 18, backgroundColor: 'rgba(255,50,50,0.9)', borderRadius: 1 },

  scoreBox: { position: 'absolute', top: 20, alignSelf: 'center', left: CANVAS_W / 2 - 40, width: 80, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 10, paddingVertical: 4, alignItems: 'center' },
  scoreText: { color: '#ffffff', fontSize: 28, fontFamily: 'monospace', fontWeight: 'bold' },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  titleTop: { color: COLORS.accent, fontSize: 58, fontFamily: 'monospace', fontWeight: 'bold', lineHeight: 62 },
  titleBottom: { color: '#ffffff', fontSize: 58, fontFamily: 'monospace', fontWeight: 'bold', lineHeight: 62 },
  divider: { width: 160, height: 1, backgroundColor: 'rgba(255,100,34,0.4)', marginVertical: 16 },
  instrText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontFamily: 'monospace', marginBottom: 2 },
  tapStart: { color: '#ffffff', fontSize: 14, fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: 3, marginTop: 32 },

  youDied: { color: COLORS.accentDanger, fontSize: 46, fontFamily: 'monospace', fontWeight: 'bold' },
  deathMsg: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'monospace', marginTop: 4, marginBottom: 20, letterSpacing: 1 },
  scoreCard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 40, alignItems: 'center', gap: 32 },
  scoreCardCol: { alignItems: 'center' },
  scoreCardDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.15)' },
  scoreCardLabel: { color: COLORS.textSecondary, fontSize: 11, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 4 },
  scoreCardVal: { color: '#ffffff', fontSize: 32, fontFamily: 'monospace', fontWeight: 'bold' },

  shareBtn: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(255,102,34,0.1)',
  },
  shareBtnText: {
    color: COLORS.accent,
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  tapRetry: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'monospace', letterSpacing: 2, marginTop: 16 },
});
