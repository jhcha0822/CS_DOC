package com.fasoo.cs_doc;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = "com.fasoo.cs_doc")
public class CsDocApplication {

    public static void main(String[] args) {
        SpringApplication.run(CsDocApplication.class, args);
    }

}
