/* ---------- collision ----------
   Circle against the collider boxes on the body's level: a box blocks only if it overlaps y+.35..y+1.7 of p.y
   (p without y counts as standing on the ground). Boxes without y0/y1 span the ground level (see 05c-levels.js). */
function collide(p,r){ const py=p.y||0;
  for(let i=0;i<colliders.length;i++){ const c=colliders[i]; if(!c.on) continue; if(!colHits(c,py)) continue;
    if(p.x<c.minX-r||p.x>c.maxX+r||p.z<c.minZ-r||p.z>c.maxZ+r) continue;
    const cx=clamp(p.x,c.minX,c.maxX), cz=clamp(p.z,c.minZ,c.maxZ); const dx=p.x-cx, dz=p.z-cz, d2=dx*dx+dz*dz; if(d2>=r*r) continue;
    if(d2>1e-8){ const d=Math.sqrt(d2); p.x+=dx/d*(r-d); p.z+=dz/d*(r-d); }
    else { const l=p.x-c.minX, rr_=c.maxX-p.x, t=p.z-c.minZ, b=c.maxZ-p.z, m=Math.min(l,rr_,t,b); if(m===l) p.x=c.minX-r; else if(m===rr_) p.x=c.maxX+r; else if(m===t) p.z=c.minZ-r; else p.z=c.maxZ+r; } }
  if(p.x<-150){ p.x=clamp(p.x,CABX-4.4,CABX+4.4); p.z=clamp(p.z,-4.4,4.4); }
  if(p.x>150){ const dx=p.x-HX, dz=p.z-HZ, d=Math.hypot(dx,dz); if(d>22.5){ p.x=HX+dx/d*22.5; p.z=HZ+dz/d*22.5; } }
}
