# interference
A simple visualization of wave interference with GPU acceleration.

![screenshot](/screen.png)

# implementation 
Calculates the wave value per pixel which is calculated the the following formula for a given point: 
```js
point => sum(wave_sources.map( origin => sin(distance(point, origin)))) 
```

## graphisme setting
This setting uses basic refraction formulas to calculate the color of the refracted "pool floor" and adds it to the phong shading with specular reflections based on the fixed light position and the surface normal calculated with the wave value function.  
