import { isBuildingWall, WALL_MATERIALS, type TileKindId, type WallMaterialId } from '@containment/shared';
import { Color } from 'three';
import { darken, noise3 } from '../voxel/palette.ts';
import type { Side } from '../world/levelVoxels.ts';
import { FACADE_BAND, WALL_PALETTE } from '../world/wallPalette.ts';
import { FLOOR_LAYERS, STEP_VOXELS, TILE_RESOLUTION, WALL_LAYERS } from '../world/worldScale.ts';

const R = TILE_RESOLUTION;
export const FACADE_STOREY = 8;
export const FACADE_GROUND_FLOOR = 12;
export const FACADE_PANE = 4;
export const FACADE_MASSING_RISE = 2 * STEP_VOXELS;
const BLOCK_TILES = 24;
const NEON_RUN = 6;
const NEON_SHARE = 0.35;
const NEON_ROWS = 2;
const LIT_SHARE = 0.4;

export const SIDE_SALT: Readonly<Record<Side, number>> = { north: 1, south: 2, east: 3, west: 4 };

export const TOWER_FACE = {
  plinth: 0x1f2326,
  shop: 0x10161c,
  fascia: 0x1a1f24,
  sill: 0x767b7e,
  mullion: 0x23292e,
  glass: 0x131a21,
  glassBlue: 0x1b2833,
} as const;

export const WALL_FACE = {
  litWindow: 0xffd08a,
  darkWindow: 0x161c22,
  slit: 0x9feaff,
  sill: 0x8a857b,
  band: FACADE_BAND,
} as const;

export const TOWER_GLOWS = [0xffc070, 0xffc070, 0xffd08a, 0xffd08a, 0xffa040, 0xfff0d0, 0xffc070, 0x8fe8ff, 0xff7ab8] as const;
export const TOWER_SIGNS = [0xff2a8a, 0x19d9ff, 0xffb21a, 0x9a5cff, 0x3dffa8] as const;
export const WINDOW_GLOWS = [0xffc070, 0xffc070, 0xffc070, 0xffa040, 0xffa040, WALL_FACE.litWindow, WALL_FACE.litWindow, 0xffc070, 0x19d9ff, 0xff2a8a] as const;
export const ROOFLINE_GLOWS = [0xff2a8a, 0x19d9ff, 0xffb21a, 0x9a5cff] as const;

export interface FacadeVoxel {
  readonly color: number;
  readonly emissive: boolean;
}

const solid = (color: number): FacadeVoxel => ({ color, emissive: false });
const glowing = (color: number): FacadeVoxel => ({ color, emissive: true });
const wrap = (value: number, size: number): number => ((value % size) + size) % size;
const pick = <T>(list: readonly T[], value: number): T => list[Math.floor(value * list.length)] ?? (list[0] as T);

export const facadeStyleOf = (kind: TileKindId): number => (isBuildingWall(kind) ? WALL_MATERIALS.indexOf(kind) + 1 : 0);
export const materialOfStyle = (style: number): WallMaterialId | null => WALL_MATERIALS[style - 1] ?? null;
export const towerBlock = (tx: number, ty: number): number => (Math.floor(tx / BLOCK_TILES) * 31 + Math.floor(ty / BLOCK_TILES) * 17) % 997;

function towerSpandrel(material: WallMaterialId, along: number, vy: number): FacadeVoxel {
  const palette = WALL_PALETTE[material];
  if (material === 'cladding') return solid(wrap(along, 2) === 0 ? palette.joint : palette.body);
  if (material === 'blockwork') return solid(vy % 3 === 0 || (along + (Math.floor(vy / 3) % 2) * 2) % 4 === 0 ? palette.joint : palette.body);
  return solid(palette.body);
}

export function towerFacade(material: WallMaterialId, side: Side, along: number, vy: number, street: number, top: number, block: number): FacadeVoxel {
  const salt = SIDE_SALT[side];
  if (vy >= top) return solid(WALL_PALETTE[material].cap);
  const above = vy - street - FLOOR_LAYERS;
  if (above < 2) return solid(TOWER_FACE.plinth);
  if (above < FACADE_GROUND_FLOOR) {
    const bay = Math.floor(along / R);
    if (above >= FACADE_GROUND_FLOOR - 2) return noise3(bay, block, salt, 719) < 0.3 ? glowing(pick(TOWER_SIGNS, noise3(bay, block, salt, 721))) : solid(TOWER_FACE.fascia);
    if (wrap(along, R) === 0) return solid(TOWER_FACE.mullion);
    if (above === 2) return solid(TOWER_FACE.sill);
    if (noise3(bay, block, salt, 727) < 0.5) return solid(TOWER_FACE.shop);
    const glow = pick(TOWER_GLOWS, noise3(bay, block, salt, 729));
    return glowing(above === FACADE_GROUND_FLOOR - 3 ? darken(glow, 0.3) : glow);
  }
  const level = top - 1 - vy;
  const storey = Math.floor(level / FACADE_STOREY);
  const row = level % FACADE_STOREY;
  if (row === 0 || row >= 6) return towerSpandrel(material, along, vy);
  if (row === 5) return solid(TOWER_FACE.sill);
  if (wrap(along, FACADE_PANE) === 0) return solid(TOWER_FACE.mullion);
  const pane = Math.floor(along / FACADE_PANE);
  const share = 0.15 + 0.6 * noise3(storey, block, salt, 733);
  if (noise3(pane, storey, block + salt, 739) >= share) return solid(row === 1 ? TOWER_FACE.glassBlue : TOWER_FACE.glass);
  const glow = pick(TOWER_GLOWS, noise3(pane, storey, block + salt, 743));
  return glowing(row === 1 ? darken(glow, 0.3) : glow);
}

export function windowGlow(material: WallMaterialId, tx: number, ty: number, side: Side): number | null {
  if (material === 'wall' || (tx + ty) % 2 !== 0 || noise3(tx, ty, SIDE_SALT[side], 211) <= LIT_SHARE) return null;
  return pick(WINDOW_GLOWS, noise3(tx, ty, SIDE_SALT[side], 307));
}

export function rooflineGlow(material: WallMaterialId, tx: number, ty: number, side: Side): number | null {
  if (material !== 'cladding' && material !== 'blockwork') return null;
  const runX = Math.floor(tx / NEON_RUN);
  const runY = Math.floor(ty / NEON_RUN);
  if (noise3(runX, runY, SIDE_SALT[side], 311) < 1 - NEON_SHARE) return null;
  return pick(ROOFLINE_GLOWS, noise3(runX, runY, SIDE_SALT[side], 313));
}

export function wallFacade(material: WallMaterialId, tx: number, ty: number, side: Side, h: number, u: number): FacadeVoxel | null {
  if (h <= 1) return solid(WALL_PALETTE[material].plinth);
  if ((tx + ty) % 2 === 0) {
    if (material === 'wall') {
      if (h >= 9 && h <= 10 && u >= 1 && u <= 6) return glowing(WALL_FACE.slit);
    } else {
      if (h === 5 && u >= 1 && u <= 6) return solid(WALL_FACE.sill);
      if (h >= 6 && h <= 11 && u >= 2 && u <= 5) {
        if (u === 2 || u === 5 || h === 11) return solid(darken(WALL_PALETTE[material].joint, 0.3));
        const glow = windowGlow(material, tx, ty, side);
        if (glow === null) return solid(WALL_FACE.darkWindow);
        return glowing(h === 8 ? darken(glow, 0.35) : glow);
      }
    }
  }
  if (h >= WALL_LAYERS - 1 - NEON_ROWS && h < WALL_LAYERS - 1) {
    const neon = rooflineGlow(material, tx, ty, side);
    if (neon !== null) return glowing(neon);
  }
  if (material === 'wall' && (h === 3 || h === 4)) return solid(WALL_FACE.band);
  return null;
}

const linear = (hex: number): string => {
  const color = new Color(hex);
  return `vec3( ${color.r.toFixed(5)}, ${color.g.toFixed(5)}, ${color.b.toFixed(5)} )`;
};

const table = (name: string, colors: readonly number[]): string => `const vec3 ${name}[ ${colors.length} ] = vec3[ ${colors.length} ]( ${colors.map(linear).join(', ')} );`;

const average = (colors: readonly number[]): string => {
  const sum = new Color(0, 0, 0);
  for (const hex of colors) sum.add(new Color(hex));
  return `vec3( ${(sum.r / colors.length).toFixed(5)}, ${(sum.g / colors.length).toFixed(5)}, ${(sum.b / colors.length).toFixed(5)} )`;
};

const palettes = (key: 'body' | 'joint' | 'cap' | 'plinth'): string => table(`FACADE_${key.toUpperCase()}`, WALL_MATERIALS.map((material) => WALL_PALETTE[material][key]));

export const FACADE_GLSL = `${palettes('body')}
${palettes('joint')}
${palettes('cap')}
${palettes('plinth')}
${table('FACADE_JOINT_DARK', WALL_MATERIALS.map((material) => darken(WALL_PALETTE[material].joint, 0.3)))}
${table('TOWER_GLOWS', TOWER_GLOWS)}
${table('TOWER_GLOWS_DIM', TOWER_GLOWS.map((glow) => darken(glow, 0.3)))}
${table('TOWER_SIGNS', TOWER_SIGNS)}
${table('WINDOW_GLOWS', WINDOW_GLOWS)}
${table('WINDOW_GLOWS_DIM', WINDOW_GLOWS.map((glow) => darken(glow, 0.35)))}
${table('ROOFLINE_GLOWS', ROOFLINE_GLOWS)}
const vec3 TOWER_PLINTH = ${linear(TOWER_FACE.plinth)};
const vec3 TOWER_SHOP = ${linear(TOWER_FACE.shop)};
const vec3 TOWER_FASCIA = ${linear(TOWER_FACE.fascia)};
const vec3 TOWER_SILL = ${linear(TOWER_FACE.sill)};
const vec3 TOWER_MULLION = ${linear(TOWER_FACE.mullion)};
const vec3 TOWER_GLASS = ${linear(TOWER_FACE.glass)};
const vec3 TOWER_GLASS_BLUE = ${linear(TOWER_FACE.glassBlue)};
const vec3 WALL_DARK_WINDOW = ${linear(WALL_FACE.darkWindow)};
const vec3 WALL_SILL = ${linear(WALL_FACE.sill)};
const vec3 WALL_SLIT = ${linear(WALL_FACE.slit)};
const vec3 WALL_BAND = ${linear(WALL_FACE.band)};
const vec3 TOWER_GLOW_MEAN = ${average(TOWER_GLOWS)};
const vec3 TOWER_SIGN_MEAN = ${average(TOWER_SIGNS)};
const vec3 WINDOW_GLOW_MEAN = ${average(WINDOW_GLOWS)};
const vec3 ROOFLINE_GLOW_MEAN = ${average(ROOFLINE_GLOWS)};
float facadeNoise( int x, int y, int z, int salt ) {
	uint h = uint( x ) * 374761393u + uint( y ) * 668265263u + uint( z ) * 2147483647u + uint( salt ) * 1274126177u;
	h = ( h ^ ( h >> 13u ) ) * 1274126177u;
	h = ( h ^ ( h >> 15u ) ) * 2246822519u;
	return float( h ^ ( h >> 16u ) ) / 4294967295.0;
}
int facadePick( float value, int count ) {
	return min( int( value * float( count ) ), count - 1 );
}
int facadeWrap( int value, int size ) {
	return value - size * int( floor( float( value ) / float( size ) ) );
}
struct FacadeLook {
	vec3 body;
	vec3 glow;
	float cover;
};
FacadeLook facadeSolid( vec3 color ) {
	return FacadeLook( color, vec3( 0.0 ), 0.0 );
}
FacadeLook facadeGlowing( vec3 color ) {
	return FacadeLook( vec3( 0.0 ), color, 1.0 );
}
vec3 towerSpandrel( int material, int along, int vy ) {
	if ( material == 3 ) return facadeWrap( along, 2 ) == 0 ? FACADE_JOINT[ 3 ] : FACADE_BODY[ 3 ];
	if ( material == 2 ) return facadeWrap( vy, 3 ) == 0 || facadeWrap( along + facadeWrap( vy / 3, 2 ) * 2, 4 ) == 0 ? FACADE_JOINT[ 2 ] : FACADE_BODY[ 2 ];
	return FACADE_BODY[ material ];
}
vec3 towerSpandrelMean( int material ) {
	if ( material == 3 ) return 0.5 * ( FACADE_JOINT[ 3 ] + FACADE_BODY[ 3 ] );
	if ( material == 2 ) return mix( FACADE_BODY[ 2 ], FACADE_JOINT[ 2 ], 0.5 );
	return FACADE_BODY[ material ];
}
FacadeLook towerVoxel( int material, int salt, int along, int vy, int street, int top, int block ) {
	if ( vy >= top ) return facadeSolid( FACADE_CAP[ material ] );
	int above = vy - street;
	if ( above < 2 ) return facadeSolid( TOWER_PLINTH );
	if ( above < ${FACADE_GROUND_FLOOR} ) {
		int bay = along / ${R};
		if ( above >= ${FACADE_GROUND_FLOOR - 2} ) {
			if ( facadeNoise( bay, block, salt, 719 ) < 0.3 ) return facadeGlowing( TOWER_SIGNS[ facadePick( facadeNoise( bay, block, salt, 721 ), ${TOWER_SIGNS.length} ) ] );
			return facadeSolid( TOWER_FASCIA );
		}
		if ( facadeWrap( along, ${R} ) == 0 ) return facadeSolid( TOWER_MULLION );
		if ( above == 2 ) return facadeSolid( TOWER_SILL );
		if ( facadeNoise( bay, block, salt, 727 ) < 0.5 ) return facadeSolid( TOWER_SHOP );
		int glow = facadePick( facadeNoise( bay, block, salt, 729 ), ${TOWER_GLOWS.length} );
		return facadeGlowing( above == ${FACADE_GROUND_FLOOR - 3} ? TOWER_GLOWS_DIM[ glow ] : TOWER_GLOWS[ glow ] );
	}
	int level = top - 1 - vy;
	int storey = level / ${FACADE_STOREY};
	int row = level - storey * ${FACADE_STOREY};
	if ( row == 0 || row >= 6 ) return facadeSolid( towerSpandrel( material, along, vy ) );
	if ( row == 5 ) return facadeSolid( TOWER_SILL );
	if ( facadeWrap( along, ${FACADE_PANE} ) == 0 ) return facadeSolid( TOWER_MULLION );
	int pane = along / ${FACADE_PANE};
	float share = 0.15 + 0.6 * facadeNoise( storey, block, salt, 733 );
	if ( facadeNoise( pane, storey, block + salt, 739 ) >= share ) return facadeSolid( row == 1 ? TOWER_GLASS_BLUE : TOWER_GLASS );
	int glow = facadePick( facadeNoise( pane, storey, block + salt, 743 ), ${TOWER_GLOWS.length} );
	return facadeGlowing( row == 1 ? TOWER_GLOWS_DIM[ glow ] : TOWER_GLOWS[ glow ] );
}
FacadeLook towerShopCell( int material, float lit, vec3 glow, float sign, vec3 signGlow ) {
	vec3 body = ( 2.0 * 8.0 * TOWER_PLINTH + 7.0 * TOWER_SILL + 8.0 * TOWER_MULLION + 49.0 * ( 1.0 - lit ) * TOWER_SHOP + 16.0 * ( 1.0 - sign ) * TOWER_FASCIA ) / max( 1.0, 16.0 + 7.0 + 8.0 + 49.0 * ( 1.0 - lit ) + 16.0 * ( 1.0 - sign ) );
	float cover = ( 49.0 * lit + 16.0 * sign ) / 96.0;
	vec3 light = ( 49.0 * lit * glow + 16.0 * sign * signGlow ) / max( 1e-4, 49.0 * lit + 16.0 * sign );
	return FacadeLook( body, light, cover );
}
FacadeLook towerStoreyCell( int material, float lit, vec3 glow ) {
	vec3 spandrel = towerSpandrelMean( material );
	vec3 glass = 0.25 * TOWER_GLASS_BLUE + 0.75 * TOWER_GLASS;
	vec3 body = ( 12.0 * spandrel + 4.0 * TOWER_SILL + 4.0 * TOWER_MULLION + 12.0 * ( 1.0 - lit ) * glass ) / ( 20.0 + 12.0 * ( 1.0 - lit ) );
	return FacadeLook( body, glow, 12.0 * lit / 32.0 );
}
FacadeLook towerCell( int material, int salt, int along, int vy, int street, int top, int block ) {
	if ( vy >= top ) return facadeSolid( FACADE_CAP[ material ] );
	int above = vy - street;
	if ( above < ${FACADE_GROUND_FLOOR} ) {
		int bay = along / ${R};
		float lit = facadeNoise( bay, block, salt, 727 ) < 0.5 ? 0.0 : 1.0;
		float sign = facadeNoise( bay, block, salt, 719 ) < 0.3 ? 1.0 : 0.0;
		int glow = facadePick( facadeNoise( bay, block, salt, 729 ), ${TOWER_GLOWS.length} );
		vec3 shop = ( TOWER_GLOWS_DIM[ glow ] + 6.0 * TOWER_GLOWS[ glow ] ) / 7.0;
		return towerShopCell( material, lit, shop, sign, TOWER_SIGNS[ facadePick( facadeNoise( bay, block, salt, 721 ), ${TOWER_SIGNS.length} ) ] );
	}
	int level = top - 1 - vy;
	int storey = level / ${FACADE_STOREY};
	int pane = along / ${FACADE_PANE};
	float share = 0.15 + 0.6 * facadeNoise( storey, block, salt, 733 );
	float lit = facadeNoise( pane, storey, block + salt, 739 ) >= share ? 0.0 : 1.0;
	int glow = facadePick( facadeNoise( pane, storey, block + salt, 743 ), ${TOWER_GLOWS.length} );
	return towerStoreyCell( material, lit, 0.25 * TOWER_GLOWS_DIM[ glow ] + 0.75 * TOWER_GLOWS[ glow ] );
}
FacadeLook towerMean( int material, int salt, int vy, int street, int top, int block ) {
	if ( vy >= top ) return facadeSolid( FACADE_CAP[ material ] );
	if ( vy - street < ${FACADE_GROUND_FLOOR} ) return towerShopCell( material, 0.5, TOWER_GLOW_MEAN, 0.3, TOWER_SIGN_MEAN );
	int storey = ( top - 1 - vy ) / ${FACADE_STOREY};
	return towerStoreyCell( material, 0.15 + 0.6 * facadeNoise( storey, block, salt, 733 ), TOWER_GLOW_MEAN * 0.92 );
}
vec3 wallBody( int material, int h, int u ) {
	if ( material == 0 ) {
		if ( h == 3 || h == 4 ) return WALL_BAND;
		return u == 0 || facadeWrap( h, 6 ) == 1 ? FACADE_JOINT[ 0 ] : FACADE_BODY[ 0 ];
	}
	return mix( FACADE_BODY[ material ], FACADE_JOINT[ material ], 0.3 );
}
FacadeLook wallVoxel( int material, int salt, int tx, int ty, int h, int u ) {
	if ( h <= 1 ) return facadeSolid( FACADE_PLINTH[ material ] );
	if ( facadeWrap( tx + ty, 2 ) == 0 ) {
		if ( material == 0 ) {
			if ( h >= 9 && h <= 10 && u >= 1 && u <= 6 ) return facadeGlowing( WALL_SLIT );
		} else {
			if ( h == 5 && u >= 1 && u <= 6 ) return facadeSolid( WALL_SILL );
			if ( h >= 6 && h <= 11 && u >= 2 && u <= 5 ) {
				if ( u == 2 || u == 5 || h == 11 ) return facadeSolid( FACADE_JOINT_DARK[ material ] );
				if ( facadeNoise( tx, ty, salt, 211 ) <= ${LIT_SHARE} ) return facadeSolid( WALL_DARK_WINDOW );
				int glow = facadePick( facadeNoise( tx, ty, salt, 307 ), ${WINDOW_GLOWS.length} );
				return facadeGlowing( h == 8 ? WINDOW_GLOWS_DIM[ glow ] : WINDOW_GLOWS[ glow ] );
			}
		}
	}
	if ( h >= ${WALL_LAYERS - 1 - NEON_ROWS} && h < ${WALL_LAYERS - 1} && ( material == 2 || material == 3 ) ) {
		int runX = tx / ${NEON_RUN};
		int runY = ty / ${NEON_RUN};
		if ( facadeNoise( runX, runY, salt, 311 ) >= ${(1 - NEON_SHARE).toFixed(2)} ) return facadeGlowing( ROOFLINE_GLOWS[ facadePick( facadeNoise( runX, runY, salt, 313 ), ${ROOFLINE_GLOWS.length} ) ] );
	}
	return facadeSolid( wallBody( material, h, u ) );
}
FacadeLook wallCell( int material, float bay, float lit, vec3 glow, float neon, vec3 neonGlow ) {
	vec3 plain = material == 0 ? mix( FACADE_BODY[ 0 ], WALL_BAND, 0.15 ) : mix( FACADE_BODY[ material ], FACADE_JOINT[ material ], 0.3 );
	float windowArea = material == 0 ? 0.0 : bay * 30.0;
	float glassArea = material == 0 ? 0.0 : bay * 10.0;
	float slitArea = material == 0 ? bay * 12.0 : 0.0;
	float neonArea = neon * 16.0;
	float glowArea = glassArea * lit + slitArea + neonArea;
	float bodyArea = 128.0 - glowArea;
	vec3 body = ( 16.0 * FACADE_PLINTH[ material ] + ( windowArea - glassArea ) * mix( WALL_SILL, FACADE_JOINT_DARK[ material ], 0.7 ) + glassArea * ( 1.0 - lit ) * WALL_DARK_WINDOW + ( bodyArea - 16.0 - windowArea + glassArea * lit ) * plain ) / max( 1.0, bodyArea );
	vec3 light = ( glassArea * lit * glow + slitArea * WALL_SLIT + neonArea * neonGlow ) / max( 1e-4, glowArea );
	return FacadeLook( body, light, glowArea / 128.0 );
}
FacadeLook wallTile( int material, int salt, int tx, int ty ) {
	float bay = facadeWrap( tx + ty, 2 ) == 0 ? 1.0 : 0.0;
	float lit = facadeNoise( tx, ty, salt, 211 ) > ${LIT_SHARE} ? 1.0 : 0.0;
	int glow = facadePick( facadeNoise( tx, ty, salt, 307 ), ${WINDOW_GLOWS.length} );
	float neon = 0.0;
	vec3 neonGlow = vec3( 0.0 );
	if ( material == 2 || material == 3 ) {
		int runX = tx / ${NEON_RUN};
		int runY = ty / ${NEON_RUN};
		neon = facadeNoise( runX, runY, salt, 311 ) >= ${(1 - NEON_SHARE).toFixed(2)} ? 1.0 : 0.0;
		neonGlow = ROOFLINE_GLOWS[ facadePick( facadeNoise( runX, runY, salt, 313 ), ${ROOFLINE_GLOWS.length} ) ];
	}
	return wallCell( material, bay, lit, 0.2 * WINDOW_GLOWS_DIM[ glow ] + 0.8 * WINDOW_GLOWS[ glow ], neon, neonGlow );
}
FacadeLook wallMean( int material ) {
	float neon = material == 2 || material == 3 ? ${NEON_SHARE.toFixed(2)} : 0.0;
	return wallCell( material, 0.5, ${(1 - LIT_SHARE).toFixed(2)}, WINDOW_GLOW_MEAN, neon, ROOFLINE_GLOW_MEAN );
}
FacadeLook facadeBlend( FacadeLook a, FacadeLook b, float t ) {
	float cover = mix( a.cover, b.cover, t );
	vec3 body = mix( a.body * ( 1.0 - a.cover ), b.body * ( 1.0 - b.cover ), t ) / max( 1e-4, 1.0 - cover );
	vec3 glow = mix( a.glow * a.cover, b.glow * b.cover, t ) / max( 1e-4, cover );
	return FacadeLook( body, glow, cover );
}
FacadeLook facadeLook( int style, vec3 world, vec3 normal, float topVoxel, float streetVoxel, float blur ) {
	int material = style - 1;
	bool across = abs( normal.z ) > abs( normal.x );
	int salt = across ? ( normal.z > 0.0 ? 2 : 1 ) : ( normal.x > 0.0 ? 3 : 4 );
	vec2 inward = floor( world.xz + 0.5 - normal.xz * 0.5 );
	int tx = int( inward.x );
	int ty = int( inward.y );
	float alongF = ( ( across ? world.x : world.z ) + 0.5 ) * ${R}.0;
	float vyF = world.y * ${R}.0 + ${FLOOR_LAYERS}.0;
	int along = int( floor( alongF ) );
	int vy = int( floor( vyF ) );
	int top = int( topVoxel + 0.5 );
	int street = int( streetVoxel + 0.5 );
	float near = smoothstep( 0.55, 1.35, blur );
	float far = smoothstep( 2.5, 6.0, blur );
	if ( top - ${FLOOR_LAYERS + WALL_LAYERS - 1} - ( street - ${FLOOR_LAYERS} ) >= ${FACADE_MASSING_RISE} ) {
		int block = facadeWrap( ( tx / ${BLOCK_TILES} ) * 31 + ( ty / ${BLOCK_TILES} ) * 17, 997 );
		FacadeLook look = towerCell( material, salt, along, vy, street, top, block );
		if ( near < 1.0 ) look = facadeBlend( towerVoxel( material, salt, along, vy, street, top, block ), look, near );
		if ( far > 0.0 ) look = facadeBlend( look, towerMean( material, salt, vy, street, top, block ), far );
		return look;
	}
	int lx = facadeWrap( along, ${R} );
	int u = salt == 2 ? lx : salt == 1 ? ${R - 1} - lx : salt == 3 ? ${R - 1} - lx : lx;
	int h = vy - ( top - ${WALL_LAYERS - 1} );
	FacadeLook look = wallTile( material, salt, tx, ty );
	if ( near < 1.0 ) look = facadeBlend( wallVoxel( material, salt, tx, ty, h, u ), look, near );
	if ( far > 0.0 ) look = facadeBlend( look, wallMean( material ), far );
	return look;
}`;
