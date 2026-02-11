/* eslint-disable react/no-unknown-property */
import * as THREE from 'three';
import { useRef, useState, useEffect, memo, useMemo } from 'react';
import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber';
import {
  useFBO,
  useScroll,
  Image,
  Scroll,
  Preload,
  ScrollControls,
  MeshTransmissionMaterial,
  Text
} from '@react-three/drei';
import { easing } from 'maath';

export default function FluidGlass({ mode = 'lens', lensProps = {}, barProps = {}, cubeProps = {}, content }) {
  const Wrapper = mode === 'bar' ? Bar : mode === 'cube' ? Cube : Lens;
  const rawOverrides = mode === 'bar' ? barProps : mode === 'cube' ? cubeProps : lensProps;

  const {
    navItems = [
      { label: 'Home', link: '#home' },
      { label: 'Cats', link: '#cats' },
      { label: '💕', link: '#love' }
    ],
    ...modeProps
  } = rawOverrides;

  return (
    <Canvas camera={{ position: [0, 0, 20], fov: 15 }} gl={{ alpha: true }}>
      <ScrollControls damping={0.2} pages={3} distance={0.4}>
        {mode === 'bar' && <NavItems items={navItems} />}
        <Wrapper modeProps={modeProps}>
          <Scroll>
            <Typography content={content} />
            <CatImages />
          </Scroll>
          <Scroll html />
          <Preload />
        </Wrapper>
      </ScrollControls>
    </Canvas>
  );
}

// Create procedural geometries instead of loading GLB files
function useProceduralGeometry(type) {
  return useMemo(() => {
    switch (type) {
      case 'lens':
        return new THREE.CylinderGeometry(1, 1, 0.3, 64);
      case 'cube':
        return new THREE.BoxGeometry(1.5, 1.5, 1.5, 32, 32, 32);
      case 'bar':
        return new THREE.BoxGeometry(8, 0.6, 0.4, 32, 32, 32);
      default:
        return new THREE.CylinderGeometry(1, 1, 0.3, 64);
    }
  }, [type]);
}

const ModeWrapper = memo(function ModeWrapper({
  children,
  geometryType = 'lens',
  lockToBottom = false,
  followPointer = true,
  modeProps = {},
  ...props
}) {
  const ref = useRef();
  const geometry = useProceduralGeometry(geometryType);
  const buffer = useFBO();
  const { viewport: vp } = useThree();
  const [scene] = useState(() => new THREE.Scene());
  const geoWidthRef = useRef(1);

  useEffect(() => {
    geometry.computeBoundingBox();
    geoWidthRef.current = geometry.boundingBox.max.x - geometry.boundingBox.min.x || 1;
  }, [geometry]);

  useFrame((state, delta) => {
    const { gl, viewport, pointer, camera } = state;
    const v = viewport.getCurrentViewport(camera, [0, 0, 15]);

    const destX = followPointer ? (pointer.x * v.width) / 2 : 0;
    const destY = lockToBottom ? -v.height / 2 + 0.2 : followPointer ? (pointer.y * v.height) / 2 : 0;
    easing.damp3(ref.current.position, [destX, destY, 15], 0.15, delta);

    if (modeProps.scale == null) {
      const maxWorld = v.width * 0.9;
      const desired = maxWorld / geoWidthRef.current;
      ref.current.scale.setScalar(Math.min(0.15, desired));
    }

    gl.setRenderTarget(buffer);
    gl.render(scene, camera);
    gl.setRenderTarget(null);

    // Beautiful gradient background - pink/purple for Promise Day
    gl.setClearColor(0xff6b9d, 1);
  });

  const { scale, ior, thickness, anisotropy, chromaticAberration, ...extraMat } = modeProps;

  return (
    <>
      {/* Render children and the glass mesh into the buffer scene */}
      {createPortal(
        <>
          {children}
          <mesh 
            ref={ref} 
            scale={scale ?? 0.15} 
            rotation-x={geometryType === 'lens' ? Math.PI / 2 : 0} 
            geometry={geometry} 
            {...props}
          >
            <MeshTransmissionMaterial
              buffer={buffer.texture}
              ior={ior ?? 1.15}
              thickness={thickness ?? 5}
              anisotropy={anisotropy ?? 0.01}
              chromaticAberration={chromaticAberration ?? 0.1}
              {...extraMat}
            />
          </mesh>
        </>,
        scene
      )}
      {/* Show the buffer texture in the main scene */}
      <mesh scale={[vp.width, vp.height, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={buffer.texture} transparent />
      </mesh>
    </>
  );
});

function Lens({ modeProps, ...p }) {
  return <ModeWrapper geometryType="lens" followPointer modeProps={modeProps} {...p} />;
}

function Cube({ modeProps, ...p }) {
  return <ModeWrapper geometryType="cube" followPointer modeProps={modeProps} {...p} />;
}

function Bar({ modeProps = {}, ...p }) {
  const defaultMat = {
    transmission: 1,
    roughness: 0,
    thickness: 10,
    ior: 1.15,
    color: '#ffffff',
    attenuationColor: '#ffffff',
    attenuationDistance: 0.25
  };

  return (
    <ModeWrapper
      geometryType="bar"
      lockToBottom
      followPointer={false}
      modeProps={{ ...defaultMat, ...modeProps }}
      {...p}
    />
  );
}

function NavItems({ items }) {
  const group = useRef();
  const { viewport, camera } = useThree();

  const DEVICE = {
    mobile: { max: 639, spacing: 0.2, fontSize: 0.035 },
    tablet: { max: 1023, spacing: 0.24, fontSize: 0.035 },
    desktop: { max: Infinity, spacing: 0.3, fontSize: 0.035 }
  };
  const getDevice = () => {
    const w = window.innerWidth;
    return w <= DEVICE.mobile.max ? 'mobile' : w <= DEVICE.tablet.max ? 'tablet' : 'desktop';
  };

  const [device, setDevice] = useState(getDevice());

  useEffect(() => {
    const onResize = () => setDevice(getDevice());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { spacing, fontSize } = DEVICE[device];

  useFrame(() => {
    if (!group.current) return;
    const v = viewport.getCurrentViewport(camera, [0, 0, 15]);
    group.current.position.set(0, -v.height / 2 + 0.2, 15.1);

    group.current.children.forEach((child, i) => {
      child.position.x = (i - (items.length - 1) / 2) * spacing;
    });
  });

  const handleNavigate = link => {
    if (!link) return;
    link.startsWith('#') ? (window.location.hash = link) : (window.location.href = link);
  };

  return (
    <group ref={group} renderOrder={10}>
      {items.map(({ label, link }) => (
        <Text
          key={label}
          fontSize={fontSize}
          color="white"
          anchorX="center"
          anchorY="middle"
          depthWrite={false}
          outlineWidth={0}
          outlineBlur="20%"
          outlineColor="#000"
          outlineOpacity={0.5}
          depthTest={false}
          renderOrder={10}
          onClick={e => {
            e.stopPropagation();
            handleNavigate(link);
          }}
          onPointerOver={() => (document.body.style.cursor = 'pointer')}
          onPointerOut={() => (document.body.style.cursor = 'auto')}
        >
          {label}
        </Text>
      ))}
    </group>
  );
}

function CatImages() {
  const group = useRef();
  const data = useScroll();
  const { height } = useThree(s => s.viewport);

  useFrame(() => {
    group.current.children.forEach((child, i) => {
      if (child.material) {
        child.material.zoom = 1 + data.range(0, 1 / 3) / 3;
      }
    });
  });

  // Use beautiful Unsplash cat images
  const catImages = [
    'https://loremflickr.com/801/600/cat,kitty,kitten,orange,black,tabby,siamese',
    'https://loremflickr.com/600/601/cat,kitty,kitten,orange,black,tabby,siamese',
    'https://loremflickr.com/602/800/cat,kitty,kitten,orange,black,tabby,siamese',
    'https://loremflickr.com/400/302/cat,kitty,kitten,orange,black,tabby,siamese',
    'https://loremflickr.com/503/500/cat,kitty,kitten,orange,black,tabby,siamese'
  ];

  return (
    <group ref={group}>
      <Image position={[-2, 0, 0]} scale={[3, height / 1.1, 1]} url={catImages[0]} />
      <Image position={[2, 0, 3]} scale={3} url={catImages[1]} />
      <Image position={[-2.05, -height, 6]} scale={[1, 3, 1]} url={catImages[2]} />
      <Image position={[-0.6, -height, 9]} scale={[1, 2, 1]} url={catImages[3]} />
      <Image position={[0.75, -height, 10.5]} scale={1.5} url={catImages[4]} />
    </group>
  );
}

function Typography({ content }) {
  const DEVICE = {
    mobile: { fontSize: 0.09, subFontSize: 0.045 },
    tablet: { fontSize: 0.18, subFontSize: 0.08 },
    desktop: { fontSize: 0.28, subFontSize: 0.09 }
  };
  const getDevice = () => {
    const w = window.innerWidth;
    return w <= 639 ? 'mobile' : w <= 1023 ? 'tablet' : 'desktop';
  };

  const [device, setDevice] = useState(getDevice());
  const { height } = useThree(s => s.viewport);

  useEffect(() => {
    const onResize = () => setDevice(getDevice());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const { fontSize, subFontSize } = DEVICE[device];

  const mainText = content?.title || 'Happy Promise Day';
  const subText = content?.subtitle || '🐱 For the cat lover 🐱';
  const message = content?.message || 'No promises needed...';
  const bottomText = content?.bottomText || 'Just cats & good vibes ✨';

  return (
    <group>
      {/* Main Title - centered */}
      <Text
        position={[0, 0.3, 12]}
        fontSize={fontSize}
        letterSpacing={-0.05}
        outlineWidth={0}
        outlineBlur="20%"
        outlineColor="#000"
        outlineOpacity={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {mainText}
      </Text>

      {/* Subtitle - remains centered */}
      <Text
        position={[0, -0.1, 12]}
        fontSize={subFontSize}
        letterSpacing={0}
        outlineWidth={0}
        outlineBlur="10%"
        outlineColor="#000"
        outlineOpacity={0.3}
        color="#fff5f8"
        anchorX="center"
        anchorY="middle"
      >
        {subText}
      </Text>

      {/* Middle section message - moved slightly up */}
      <Text
        position={[0, -height * 1.0, 12]}
        fontSize={fontSize * 0.7}
        letterSpacing={-0.02}
        outlineWidth={0}
        outlineBlur="15%"
        outlineColor="#000"
        outlineOpacity={0.4}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {message}
      </Text>

      {/* Bottom text - remains centered */}
      <Text
        position={[0, -height * 2 + 0.5, 12]}
        fontSize={fontSize * 0.6}
        letterSpacing={0}
        outlineWidth={0}
        outlineBlur="15%"
        outlineColor="#000"
        outlineOpacity={0.4}
        color="#fff5f8"
        anchorX="center"
        anchorY="middle"
      >
        {bottomText}
      </Text>
    </group>
  );
}
